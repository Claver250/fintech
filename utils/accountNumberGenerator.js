const Account = require('../models/account');

async function generateUniqueAccountNumber() {
    let accountNumber;
    let exists = true;

    while (exists) {
        const year = new Date().getFullYear().toString().slice(-2);
        const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
        accountNumber = `30${year}${randomDigits}`;

        // const existingAccount = await Account.findOne({ where: { accountNumber } });
        // if (!existingAccount) exists = false;
    }

    console.log('Generated unique accountNumber:', accountNumber);
    return accountNumber; // ✅ must return the string
}

module.exports = generateUniqueAccountNumber;
