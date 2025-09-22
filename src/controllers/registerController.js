const { User } = require("../models");
const { generateToken } = require("../middlewares/auth");
const { validateUserRegistration } = require("../utils/validation");

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

    // Prepare user data for validation
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const userData = {
      email,
      password,
      fullName,
      phone,
      role: "patient"
    };

    console.log("🔍 Extracted fields:", {
      email,
      firstName,
      lastName,
      phone,
      hasPassword: !!password,
    });

    // Validate user data using validation utils
    const validation = validateUserRegistration(userData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create user account ONLY
    const user = await User.create({
      email,
      password,
      role: "patient",
      fullName,
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
