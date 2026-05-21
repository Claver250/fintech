const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const transferController = require('../controllers/transactionController');

router.post('/', authenticate, transactionController.getTransactions);

module.exports = router;