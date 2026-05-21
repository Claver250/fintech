const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authMiddleware');

router.post('/signup', authController.signUp);
router.post('/verify-otp', authController.verifySignupOtp);
router.post('/login', authController.login);
// router.get('/users', authController.getUsers)

// router.get('/me', authenticate, authController.getProfile);

module.exports = router;