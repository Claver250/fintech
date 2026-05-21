const Transaction = require('../models/transaction');
const Account = require('../models/account');
const sequelize = require('../config/database');

const getTransactions = async (req, res) => {
    const userId = req.user?.userID; // Adjust based on your authentication middleware's user object structure
    try {
        const transactions = await Transaction.findAll({
            include: {
                model: Account,
                where: { userID: userId },
                attributes: ['accountNumber']
            },
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(transactions);
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getTransactions
};      