// src/config/stripe.js
require('dotenv').config();

const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  frontendUrl: process.env.APP_FRONTEND_URL || 'http://localhost:3000',
  currency: process.env.STRIPE_CURRENCY || 'usd',
};

module.exports = stripeConfig;


