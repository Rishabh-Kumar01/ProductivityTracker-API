const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/otp/request — Send OTP to email
router.post('/otp/request', authController.requestOTP);

// POST /api/auth/otp/verify — Verify OTP and get tokens
router.post('/otp/verify', authController.verifyOTP);

// POST /api/auth/refresh — Refresh access token
router.post('/refresh', authController.refresh);

// POST /api/auth/logout — Revoke refresh token
router.post('/logout', authController.logout);

module.exports = router;
