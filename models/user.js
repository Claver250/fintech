// 1. You can remove UUIDv4 from the top destructuring to avoid confusion
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, // 2. Change this to DataTypes.UUIDV4 (All Uppercase!)
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^[0-9]{10,15}$/ // Validates standard phone lengths cleanly
        }
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
});

module.exports = User;