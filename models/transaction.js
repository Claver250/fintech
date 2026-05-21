const {Sequelize, DataTypes, UUIDV4} = require('sequelize');
const sequelize = require("../config/database");
const Account = require('./account');

const Transaction = sequelize.define('Transaction', {
    transactionID: {
        type: DataTypes.UUID,
        defaultValue : DataTypes.UUIDV4,
        primaryKey: true,
    },
    type: {
        type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer'),
        allowNull: false,
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    reference: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        allowNull: false,        
        defaultValue: 'pending'
    }
});

Transaction.belongsTo(Account, {foreignKey: 'accountID'});
Account.hasMany(Transaction, {foreignKey: 'accountID'});

module.exports = Transaction;