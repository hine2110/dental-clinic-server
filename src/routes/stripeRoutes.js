const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { createCheckoutSession, confirmSession, retryCheckoutSession } = require('../controllers/stripeController');

// Create checkout session
router.post('/create-checkout-session', authenticate, createCheckoutSession);

// Retry a pending checkout session
router.post('/retry-checkout-session', authenticate, retryCheckoutSession);

// Confirm session after success redirect (no webhook required)
router.post('/confirm-session', confirmSession);

module.exports = router;


