const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/employee-id', authController.loginByEmployeeId);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/owner-setup', authController.setupOwnerProfile);
router.post('/register', authController.register);

module.exports = router;
