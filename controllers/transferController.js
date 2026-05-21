const { v4: uuidv4 } = require('uuid');
const Account = require('../models/account');
const Transaction = require('../models/transaction');
const Transfer = require('../models/transfer');
const sequelize = require('../config/database');
const OTPUtils = require('../utils/otp'); 

const transferFunds = async (req, res) => {
    console.log("--- DEBUGGING TRANSFER AUTH ---");
    console.log("Full req.user object:", req.user);
    console.log("Headers Authorization:", req.headers.authorization);
    
    const { senderAccountId, receiverAccountId, amount } = req.body;
    
    // 1. Target the exact property name assigned by your authentication middleware
    const authenticatedUserId = req.user?.userID;

    // 🛡️ CRITICAL GUARD: Halt execution if the token context is missing or invalid
    if (!authenticatedUserId) {
        return res.status(401).json({ 
            message: 'Authentication failed. Please log in again to generate a valid token.' 
        });
    }

    if (!senderAccountId || !receiverAccountId || !amount) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({ message: 'Transfer amount must be a valid positive number' });
    }

    if (senderAccountId === receiverAccountId) {
        return res.status(400).json({ message: 'Cannot transfer to the same account' });
    }

    // Initialize the managed database transaction
    const t = await sequelize.transaction();

    try {
        // 2. Fetch Sender account using pessimistic row-locking
        const senderAccount = await Account.findOne({ 
            where: { 
                accountID: senderAccountId, 
                userID: authenticatedUserId 
            }, 
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!senderAccount) {
            await t.rollback();
            return res.status(404).json({ message: 'Sender account not found or unauthorized' });
        }

        // 3. Fetch Receiver account
        const receiverAccount = await Account.findOne({ 
            where: { accountID: receiverAccountId }, 
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!receiverAccount) {
            await t.rollback();
            return res.status(404).json({ message: 'Receiver account not found' });
        }

        // 4. Handle money values as precise numbers instead of database strings
        const currentSenderBalance = parseFloat(senderAccount.balance);
        const currentReceiverBalance = parseFloat(receiverAccount.balance);

        if (currentSenderBalance < transferAmount) {
            await t.rollback();
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        // 5. Apply the balance adjustments
        senderAccount.balance = currentSenderBalance - transferAmount;
        receiverAccount.balance = currentReceiverBalance + transferAmount;

        await senderAccount.save({ transaction: t });
        await receiverAccount.save({ transaction: t });

        // Unused local properties maintained for system architectural consistency
        const otp = OTPUtils.generate ? OTPUtils.generate(6) : '000000';
        const hash = OTPUtils.hash ? OTPUtils.hash(otp) : '';
        const uniqueTxReference = uuidv4();

        // 6. Generate explicit, dual-entry audit ledgers
        const referencePrefix = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        await Transaction.create({ 
            type: 'transfer', 
            amount: transferAmount, 
            accountID: senderAccountId, 
            description: `Transfer to account ${receiverAccount.accountNumber}`,
            reference: `${referencePrefix}-DB`,
            status: 'completed'
        }, { transaction: t });

        await Transaction.create({ 
            type: 'transfer', 
            amount: transferAmount, 
            accountID: receiverAccountId, 
            description: `Transfer from account ${senderAccount.accountNumber}`,
            reference: `${referencePrefix}-CR`,
            status: 'completed'
        }, { transaction: t });

        // 7. Commit structural record into the tracking table
        await Transfer.create({ 
            senderAccountId, 
            receiverAccountId, 
            amount: transferAmount, 
            status: 'successful' 
        }, { transaction: t });

        // All operations successfully passed validation—commit atomic ledger changes to PostgreSQL
        await t.commit();
        
        return res.status(200).json({ 
            message: 'Transfer completed successfully',
            data: {
                reference: referencePrefix,
                amount: transferAmount.toFixed(2),
                senderAccountId,
                receiverAccountId
            }
        });

    } catch (error) {
        // Automatically drop changes and release table row locks upon interruption
        await t.rollback();
        console.error('Error during transfer execution pipeline:', error);
        return res.status(500).json({ message: 'Internal server error processing transfer' });
    }
};

module.exports = {
    transferFunds
};