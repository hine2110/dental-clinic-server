const { User, Verification } = require("../models");
const { sendPasswordResetEmail } = require("../services/emailService");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Assign plain new password; pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error changing password",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Tạo reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Lưu reset token
    await Verification.findOneAndUpdate(
      { email, type: "password_reset" },
      {
        email,
        code: resetToken,
        type: "password_reset",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 giờ
        isUsed: false,
      },
      { upsert: true, new: true }
    );

    // Gửi email reset
    await sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send password reset email",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const verification = await Verification.findOne({
      code: token,
      type: "password_reset",
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Tìm user và cập nhật mật khẩu
    const user = await User.findOne({ email: verification.email }).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Assign plain new password; pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    // Đánh dấu token đã sử dụng
    verification.isUsed = true;
    await verification.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

const checkResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const verification = await Verification.findOne({
      code: token,
      type: "password_reset",
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    res.json({
      success: true,
      message: "Reset token is valid",
    });
  } catch (error) {
    console.error("Check reset token error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check reset token",
    });
  }
};

module.exports = {
  changePassword,
  forgotPassword,
  resetPassword,
  checkResetToken,
};
