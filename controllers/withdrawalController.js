const { v4: uuidv4 } = require('uuid');
const Account = require('../models/account'); // Check casing matching your file system layout
const Transaction = require('../models/transaction');
const sequelize = require('../config/database');

const withdrawFunds = async (req, res) => {
    console.log("--- DEBUGGING WITHDRAWAL AUTH ---");
    
    const accountId = req.params.id;
    const { amount } = req.body;
    
    // 1. Authenticate identity mapping context from your middleware
    const authenticatedUserId = req.user?.userID;
    if (!authenticatedUserId) {
        return res.status(401).json({ 
            message: 'Authentication failed. Please log in again to generate a valid token.' 
        });
    }

    if (!amount) {
        return res.status(400).json({ message: 'Missing required amount field' });
    }

    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        return res.status(400).json({ message: 'Withdrawal amount must be a valid positive number' });
    }

    // Initialize a single atomic transaction context
    const t = await sequelize.transaction();

    try {
        // 2. Fetch Account using row-locking and verify user ownership
        const account = await Account.findOne({
            where: {
                accountID: accountId, // Make sure this column name matches your Account schema case (accountID vs id)
                userID: authenticatedUserId // 🛡️ Safety check: Ensures users can only withdraw from their own account
            },
            transaction: t,
            lock: t.LOCK.UPDATE // 🔒 Pessimistic lock preventing concurrent balance exploit loops
        });

        if (!account) {
            await t.rollback();
            return res.status(404).json({ message: 'Account not found or unauthorized' });
        }

        // 3. Handle money values as precise numbers
        const currentBalance = parseFloat(account.balance);
        if (currentBalance < withdrawalAmount) {
            await t.rollback();
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        // 4. Modify balances cleanly
        account.balance = currentBalance - withdrawalAmount;
        await account.save({ transaction: t });

        // 5. Generate distinct audit log ledger trace
        const uniqueTxReference = `TXN-WIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        await Transaction.create({
            accountID: accountId, // Make sure column name casing matches your Transaction model description
            type: 'withdrawal',
            amount: withdrawalAmount,
            description: `ATM/Online cash withdrawal`,
            reference: uniqueTxReference,
            status: 'completed'
        }, { transaction: t });

        // Everything succeeded—commit transaction atomically to PostgreSQL
        await t.commit();

        return res.status(200).json({ 
            message: 'Withdrawal successful', 
            data: {
                reference: uniqueTxReference,
                newBalance: account.balance.toFixed(2)
            }
        });

    } catch (error) {
        // Safe structural fallback rollbacks on interruption
        if (!t.finished) await t.rollback();
        console.error('Error during withdrawal execution pipeline:', error);
        return res.status(500).json({ message: 'Internal server error processing withdrawal' });
    }
};

module.exports = {
    withdrawFunds
};