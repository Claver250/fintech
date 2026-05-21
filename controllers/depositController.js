const Account = require('../models/account');
const Transaction = require('../models/transaction');
// const Transaction = require('../models/transaction'); // Uncomment when your Transaction model is ready
const sequelize = require('../config/database');

exports.depositFunds = async (req, res) => {
    // Start a managed transaction to ensure database integrity 
    // (If the balance updates but the transaction log fails, everything rolls back!)
    const t = await sequelize.transaction();

    try {
        const { accountID, amount } = req.body;

        // 1. Input Validation
        if (!accountID || !amount) {
            await t.rollback();
            return res.status(400).json({ message: "Missing accountID or amount" });
        }

        // Parse amount to float and check if it's a valid positive number
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            await t.rollback();
            return res.status(400).json({ message: "Deposit amount must be a positive number" });
        }

        // 2. Find the target account (Lock the row for update to prevent race conditions)
        const account = await Account.findOne({
            where: { accountID },
            transaction: t,
            lock: t.LOCK.UPDATE 
        });

        if (!account) {
            await t.rollback();
            return res.status(404).json({ message: "Account not found" });
        }

        // 3. Calculate new balance safely using numbers to prevent string concatenation
        const currentBalance = parseFloat(account.balance);
        const newBalance = currentBalance + depositAmount;

        // 4. Update account balance
        await account.update(
            { balance: newBalance },
            { transaction: t }
        );

        // // 5. Create Transaction Audit Log (Optional but highly recommended for Fintech)
        
        await Transaction.create({
            accountID: account.accountID,
            type: 'deposit',
            amount: depositAmount,
            status: 'completed',
            reference: `DEP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
        }, { transaction: t });
        

        // Commit all changes to the database safely
        await t.commit();

        return res.status(200).json({
            message: "Deposit successful",
            data: {
                accountID: account.accountID,
                accountNumber: account.accountNumber,
                previousBalance: currentBalance.toFixed(2),
                newBalance: newBalance.toFixed(2),
                depositedAmount: depositAmount.toFixed(2)
            }
        });

    } catch (err) {
        // Rollback database changes if anything crashed
        await t.rollback();
        console.error("CRITICAL ERROR during deposit:", err);
        return res.status(500).json({ error: err.message || "Internal server error occurred." });
    }
};