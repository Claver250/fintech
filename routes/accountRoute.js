const express = require('express');
const router =express.Router();
const accountController = require('../controllers/accountController');
const depositController = require('../controllers/depositController');
const transferController = require('../controllers/transferController');
const transactionController = require('../controllers/transactionController');
const withdrawalController = require('../controllers/withdrawalController');
const authenticate = require('../middlewares/authMiddleware');

router.post('/create', authenticate, accountController.createAccount);

router.get('/:id', authenticate, accountController.getAccountsById);

router.post('/:id/deposit', depositController.depositFunds);

router.post('/transfer', authenticate, transferController.transferFunds);

router.post('/transactions', authenticate, transactionController.getTransactions);

router.post('/withdraw', authenticate, withdrawalController.withdrawFunds);



module.exports = router;