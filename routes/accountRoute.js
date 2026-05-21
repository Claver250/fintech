const express = require('express');
const router =express.Router();
const accountController = require('../controllers/accountController');
const depositController = require('../controllers/depositController');
const transferController = require('../controllers/transferController');
const transactionController = require('../controllers/transactionController');
const authenticate = require('../middlewares/authMiddleware');

router.post('/create',   accountController.createAccount);

router.get('/',   accountController.getAccounts);

router.get('/:id', accountController.getAccountsById);

router.get('/:id/transactions', accountController.getTransactionByAccount);

router.post('/:id/deposit', depositController.depositFunds);

router.post('/transfer', authenticate, transferController.transferFunds);

router.post('/transactions', authenticate, transactionController.getTransactions);



module.exports = router;