const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;
const EXPIRES_IN = '1d';

// Generate token
const generateToken = (user) => {
    return jwt.sign(
        {
            userID: user.userID,
            name: user.name,
            email: user.email,
        },
        SECRET_KEY,
        {expiresIn: EXPIRES_IN}
    );
};

// Verify token
const verifyToken = (token) => {
    return jwt.verify(token, SECRET_KEY);
};

module.exports = {generateToken, verifyToken};