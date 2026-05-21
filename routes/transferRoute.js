const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const transferController = require('../controllers/transferController');

router.post('/transfer', authenticate, transferController.transferFunds);

module.exports = router;