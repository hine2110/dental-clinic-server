const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth");

// Import controllers
const { login, getMe, logout } = require("../controllers/authController");
const { registerPatient } = require("../controllers/registerController");
const {
  sendVerificationCodeHandler,
  verifyEmailCode,
  resendVerificationCode,
} = require("../controllers/verificationController");
const {
  changePassword,
  forgotPassword,
  resetPassword,
  checkResetToken,
} = require("../controllers/passwordController");
const {
  googleAuth,
  googleCallback,
} = require("../controllers/googleController");

// Auth routes
router.post("/login", login);
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);

// Register routes
router.post("/register", registerPatient);

// Verification routes
router.post("/send-code", sendVerificationCodeHandler);
router.post("/verify-code", verifyEmailCode);
router.post("/resend-code", resendVerificationCode);

// Password routes
router.put("/change-password", authenticate, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/check-reset-token/:token", checkResetToken);

// Google OAuth routes
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

module.exports = router;
