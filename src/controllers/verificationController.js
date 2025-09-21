const { Verification } = require("../models");
const { sendVerificationCode } = require("../services/emailService");

const sendVerificationCodeHandler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Tạo mã xác thực 6 số
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu mã vào database
    await Verification.findOneAndUpdate(
      { email, type: 'registration' },
      {
        email,
        code,
        type: 'registration',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 phút
        isUsed: false
      },
      { upsert: true, new: true }
    );

    // Gửi email
    await sendVerificationCode(email, code);

    res.json({
      success: true,
      message: "Verification code sent successfully"
    });
  } catch (error) {
    console.error("Send verification code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send verification code"
    });
  }
};

const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const verification = await Verification.findOne({
      email,
      code,
      type: 'registration',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code"
      });
    }

    // Đánh dấu mã đã sử dụng
    verification.isUsed = true;
    await verification.save();

    res.json({
      success: true,
      message: "Email verified successfully"
    });
  } catch (error) {
    console.error("Verify email code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify email code"
    });
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Xóa mã cũ
    await Verification.deleteMany({ email, type: 'registration' });

    // Tạo mã mới
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu mã mới vào database
    await Verification.create({
      email,
      code,
      type: 'registration',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 phút
      isUsed: false
    });

    // Gửi email
    await sendVerificationCode(email, code);

    res.json({
      success: true,
      message: "New verification code sent successfully"
    });
  } catch (error) {
    console.error("Resend verification code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification code"
    });
  }
};

module.exports = {
  sendVerificationCodeHandler,
  verifyEmailCode,
  resendVerificationCode
};