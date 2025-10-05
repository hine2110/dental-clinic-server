const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { createCheckoutSession, confirmSession } = require('../controllers/stripeController');

// Create checkout session
router.post('/create-checkout-session', authenticate, createCheckoutSession);

// Confirm session after success redirect (no webhook required)
router.post('/confirm-session', confirmSession);

module.exports = router;


