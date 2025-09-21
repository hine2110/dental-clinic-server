const { User } = require("../models");
const { generateToken } = require("../middlewares/auth");

const registerPatient = async (req, res) => {
  try {
    console.log('📝 Register request body:', req.body);
    
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      address,
    } = req.body;

    console.log('🔍 Extracted fields:', {
      email,
      firstName,
      lastName,
      phone,
      hasPassword: !!password
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
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
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

const createStaffAccount = async (req, res) => {
  try {
    const {
      email,
      role,
      firstName,
      lastName,
      phone,
      temporaryPassword,
    } = req.body;

    // Check if user has permission to create accounts (Admin only)
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Permission denied. Only admin can create staff accounts.",
      });
    }

    // Validate role - only doctor, receptionist, nurse
    const allowedRoles = ["doctor", "receptionist", "nurse"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Allowed roles: doctor, receptionist, nurse",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Generate temporary password if not provided
    const password = temporaryPassword || `temp${Math.random().toString(36).slice(-8)}`;

    // Create user account ONLY
    const user = await User.create({
      email,
      password,
      role,
      firstName,
      lastName,
      phone,
    });

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
        },
        temporaryPassword: password,
        note: "Please change password on first login",
      },
    });
  } catch (error) {
    console.error("Create account error:", error);

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
      message: "Server error creating account",
    });
  }
};

module.exports = {
  registerPatient,
  createStaffAccount
};