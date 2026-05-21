const {Sequelize, DataTypes, UUIDV4} = require('sequelize');
const sequelize = require("../config/database");
const Account = require('./account')

const Transfer = sequelize.define('Transfer', {
    transferID : {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
    },
    senderAccountId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Account,
            key: 'accountID'
        }
    },
    receiverAccountId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Account,
            key: 'accountID'
        }
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'successful', 'failed'),
        allowNull: true,
        defaultValue: 'pending'
    },
    completed: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'completed'
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    completedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    
});

Transfer.belongsTo(Account, {
    as: 'senderAccount',
    foreignKey: 'senderAccountId',
});
Transfer.belongsTo(Account, {
    as: 'receiverAccount',
    foreignKey: 'receiverAccountId',
});

module.exports = Transfer;