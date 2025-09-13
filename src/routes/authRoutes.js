const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const {
  register,
  login,
  getMe,
  logout,
  createAccount,
  changePassword
} = require('../controllers/authController');

// @desc    Register new patient account
// @route   POST /api/auth/register
// @access  Public
router.post('/register', register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', login);

// @desc    Get current user info
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticate, getMe);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticate, logout);

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', authenticate, changePassword);

// @desc    Create new account (Admin/Staff only)
// @route   POST /api/auth/create-account
// @access  Private (Admin/Staff)
router.post('/create-account', authenticate, authorize('admin', 'receptionist'), createAccount);

module.exports = router;
