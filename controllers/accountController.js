const { error } = require('console');
const Account = require('../models/account');
const generateUniqueAccountNumber = require('../utils/accountNumberGenerator');
const Transaction = require('../models/transaction');

exports.createAccount = async (req, res) => {
    try{
        const{userID, accountType} = req.body;

        let accountNumber;
        let exists = true;

        while (exists) {
            const year = new Date().getFullYear().toString().slice(-2);
            const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
            accountNumber = `30${year}${randomDigits}`;

            const existing = await Account.findOne({ where: { accountNumber } });
            if (!existing) exists = false;
        }

        const account = await Account.create({
            userID,
            accountType,
            accountNumber,
            balance: 0.0,
        });

        res.status(201).json({
            message: "Account created successfully",
            data: account,
        })
    }catch(err){
        res.status(500).json({error: err.message})
    }
};

exports.getAccounts = async(req, res) => {
    try{
        // Only show accounts for the logged in user
        // const userId = req.user.id;

        // Admin sees all account
        const accounts = await Account.findAll();

        res.status(200).json({
            message: "Accounts fetched successfully",
            data: accounts
        });

        // if (!accounts.length) {
        //     return res.status(404).json({message: 'No accounts found' });
        // }
    }catch(err){
        res.status(500).json({error: err.message})
    }
};

exports.getAccountsById = async (req, res) => {
    try {
        const {accountID} = req.params;

        const account = await Account.findOne({
            where: {accountID},
            // include: {
            //     model: User,
            //     attributes: ['userID', 'name', 'email']
            // }

        });

        if(!account) {
            return res.status(404).json({message: 'Account not found or access denied'});
        }

        res.status(200).json({
            message: "Account details fetched successfully",
            data: account
        });
    }catch(err){
        res.status(500).json({error: err.message});
    }
};

exports.getTransactionByAccount = async (req, res) => {
    try{
        const {accountID} = req.params;

        // Ensure account belongs to user
        const account = await Account.findOne({
            where: {accountID}
        });

        if(!account){
            return res.status(404).json({ message: 'Account not found'})
        }

        const transactions = await Transaction.findAll({
            where: {accountID: account.accountID},
            attributes: ['transactionID', 'type', 'amount', 'description', 'createdAt'],
            order: [['createdAt', 'DESC']],
        });

        if (!transactions.length){
            return res.status(404).json({message: 'No transaction found'})
        }

        res.status(200).json({
            message: `Transactions for account ${accountID} fetched successfully`,
            total: transactions.length,
            data: transactions
        });
    }catch(err){
        console.error(err);
        res.status(500).json({error: err.message})
    }
};