const { User, Account, Transaction, Transfer } = require('../models');
const sequelize = require('../config/database');
const redis = require('../config/redis');
const OTPUtils = require('../utils/otp');

const verifyOtp = async (req, res) => {
    const { reference, otpCode, type } = req.body; 
    const userId = req.user?.id; // If route is protected by auth middleware

    if (!reference || !otpCode || !type) {
        return res.status(400).json({ message: 'Missing required verification fields' });
    }

    // 1. Determine the correct Redis prefix based on the workflow type
    let redisKey = '';
    if (type === 'SIGNUP') {
        redisKey = `signup:intent:${reference}`;
    } else if (type === 'TRANSFER') {
        redisKey = `transfer:intent:${reference}`;
    } else {
        return res.status(400).json({ message: 'Invalid verification type' });
    }

    try {
        // 2. Fetch the locked intent data from Redis
        const cachedData = await redis.get(redisKey);
        if (!cachedData) {
            return res.status(400).json({ message: 'OTP expired or session invalid. Please restart.' });
        }

        const contract = JSON.parse(cachedData);

        // 3. Validate security constraints
        if (type === 'TRANSFER' && contract.userId !== userId) {
            return res.status(403).json({ message: 'Unauthorized session context' });
        }

        // 4. Validate OTP code against cryptographic hash
        if (!OTPUtils.verify(otpCode, contract.hash)) {
            return res.status(401).json({ message: 'Invalid OTP code' });
        }

        // ==========================================
        // FLOW A: SIGNUP COMPLETION
        // ==========================================
        if (type === 'SIGNUP') {
            await User.update(
                { isVerified: true }, 
                { where: { id: contract.userId } }
            );

            await redis.del(redisKey); // Burn OTP immediately
            return res.status(200).json({ message: 'Account verified successfully. You can now log in.' });
        }

        // ==========================================
        // FLOW B: TRANSFER EXECUTION (Sequelize Transaction)
        // ==========================================
        if (type === 'TRANSFER') {
            const t = await sequelize.transaction();
            try {
                const { senderAccountId, receiverAccountId, amount } = contract;

                // Lock account rows inside transaction block to prevent concurrent double-spending
                const senderAccount = await Account.findOne({ 
                    where: { accountID: senderAccountId }, 
                    transaction: t, 
                    lock: t.LOCK.UPDATE 
                });
                const receiverAccount = await Account.findOne({ 
                    where: { accountID: receiverAccountId }, 
                    transaction: t, 
                    lock: t.LOCK.UPDATE 
                });

                if (!senderAccount || !receiverAccount) throw new Error('Target accounts missing at execution time');
                if (parseFloat(senderAccount.balance) < amount) throw new Error('Insufficient funds');

                // Perform core monetary arithmetic
                senderAccount.balance = parseFloat(senderAccount.balance) - amount;
                receiverAccount.balance = parseFloat(receiverAccount.balance) + amount;
                
                await senderAccount.save({ transaction: t });
                await receiverAccount.save({ transaction: t });

                // Construct audit trail records
                await Transaction.create({ type: 'transfer', amount, accountID: senderAccountId, description: `Transfer to ${receiverAccount.accountNumber}` }, { transaction: t });
                await Transaction.create({ type: 'transfer', amount, accountID: receiverAccountId, description: `Transfer from ${senderAccount.accountNumber}` }, { transaction: t });
                await Transfer.create({ senderAccountId, receiverAccountId, amount, status: 'successful' }, { transaction: t });

                await t.commit();
                await redis.del(redisKey); // Burn OTP immediately

                return res.status(200).json({ message: 'Transfer executed successfully' });

            } catch (error) {
                await t.rollback();
                console.error('Sequelize Execution Failure:', error);
                return res.status(400).json({ message: error.message || 'Transaction processing failed' });
            }
        }

    } catch (error) {
        console.error('Verification Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { verifyOtp };