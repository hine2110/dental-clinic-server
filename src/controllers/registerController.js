const { User } = require("../models");
const { generateToken } = require("../middlewares/auth");

const registerPatient = async (req, res) => {
  try {
    console.log("📝 Register request body:", req.body);

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      address,
    } = req.body;

    console.log("🔍 Extracted fields:", {
      email,
      firstName,
      lastName,
      phone,
      hasPassword: !!password,
    });

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Create user account ONLY
    const user = await User.create({
      email,
      password,
      role: "patient",
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address: address || {},
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error("Patient register error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

module.exports = {
  registerPatient,
};
