const User = require('../models/user');
const accountNumberGenerator = require('../utils/accountNumberGenerator');
const {hashPassword, comparePassword} = require('../utils/bcrypt');
const { generateToken } = require('../utils/token');
const OTPUtils = require('../utils/otp');
const redis = require('../config/redis');
const { v4: uuidv4 } = require('uuid');
const { verify } = require('node:crypto');

exports.signUp = async (req, res) => {
    try {
        const { name, email, password, phoneNumber } = req.body;

        if (!name || !email || !password || !phoneNumber) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await hashPassword(password);
        
        // Create user as unverified
        const newUser = await User.create({ 
            name, 
            email, 
            password: hashedPassword,
            phoneNumber,
            isVerified: false 
        });

        // Generate OTP credentials
        const otp = OTPUtils.generate(6);
        const hash = OTPUtils.hash(otp);
        const reference = uuidv4();

        // Save the verification session contract to Redis
        const signupContract = {
            hash,
            userId: newUser.id,
            email: newUser.email,
            type: 'SIGNUP_VERIFICATION'
        };

        await redis.set(`signup:intent:${reference}`, JSON.stringify(signupContract), 'EX', 600);

        // Dispatches the SMS via your provider (Termii/Twilio)
        console.log(`[SMS OUTBOUND] To: ${phoneNumber} | Code: ${otp} | Ref: ${reference}`);

        // Return a 202 Accepted status - indicating the action is pending the OTP step
        return res.status(202).json({ 
            message: 'Registration initiated. An OTP has been sent to your phone number.', 
            reference
        });

    } catch (error) {
        console.error('Error during sign up initiation:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.verifySignupOtp = async (req, res) => {
    try {
        const { reference, otpCode } = req.body;

        if (!reference || !otpCode) {
            return res.status(400).json({ message: 'Missing reference or OTP code' });
        }

        // 1. Pull the session back from Redis RAM
        const cachedData = await redis.get(`signup:intent:${reference}`);
        if (!cachedData) {
            return res.status(400).json({ message: 'Verification session expired. Please sign up again.' });
        }

        const contract = JSON.parse(cachedData);

        // 2. Validate the user's OTP code input against the stored hash
        if (!OTPUtils.verify(otpCode, contract.hash)) {
            return res.status(401).json({ message: 'Invalid OTP code' });
        }

        // 3. Find the pending user and activate them in the database
        const user = await User.findByPk(contract.userId);
        if (!user) {
            return res.status(404).json({ message: 'User record not found' });
        }

        user.isVerified = true;
        await user.save();

        // 4. Burn the session from Redis so it can't be re-used
        await redis.del(`signup:intent:${reference}`);

        // 5. NOW return the actual successful response payload!
        return res.status(201).json({ 
            message: 'User verified and registered successfully', 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email 
            } 
        });

    } catch (error) {
        console.error('Error during sign up confirmation:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 1. Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        
        // 2. Compare password        
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // 3. Convert the raw Sequelize instance into a clean JavaScript object
        const userJson = user.toJSON(); 

        // 4. Build a normalized payload structure matching your generateToken utility
        const tokenPayload = {
            userID: userJson.userID || userJson.id, // Handles capitalization variations safely
            name: userJson.name,
            email: userJson.email
        };

        // 5. Generate the token using the clean payload object
        const token = generateToken(tokenPayload);
        
        return res.status(200).json({
            message: 'Login successful',
            token,
        });
        
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
