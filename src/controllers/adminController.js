const { User, Staff, Doctor } = require("../models");
const bcrypt = require("bcryptjs");

const createStaffAccount = async (req, res) => {
  try {
    const { email, role, firstName, lastName, phone, temporaryPassword } =
      req.body;

    // Check if user has permission to create accounts (Admin only)
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Permission denied. Only admin can create staff accounts.",
      });
    }

    // Validate role - only doctor, staff
    const allowedRoles = ["doctor", "staff"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Allowed roles: doctor, staff",
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
    const plainPassword =
      temporaryPassword || `temp${Math.random().toString(36).slice(-8)}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    // Create user account
    const user = await User.create({
      email,
      password: hashedPassword,
      role,
      fullName: `${firstName} ${lastName}`.trim(),
      phone,
    });

    // Create corresponding profile based on role
    if (role === "staff") {
      await Staff.create({
        user: user._id,
        permissions: {
          handlePrescriptions: false,
          dispenseMedicines: false,
          reportEquipment: false,
          handleInvoices: false,
        },
      });
    } else if (role === "doctor") {
      // Generate doctorId
      const doctorId = `DOC${Date.now()}${Math.random()
        .toString(36)
        .slice(-4)
        .toUpperCase()}`;

      // Create Doctor profile with default values
      // Admin can update these later with proper information
      await Doctor.create({
        doctorId,
        user: user._id,
        license: "PENDING", // Admin needs to update
        specializations: "General Dentistry", // Admin needs to update
        workSchedule: "To be determined", // Admin needs to update
        consultationFee: 0, // Admin needs to update
      });
    }

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
        temporaryPassword: plainPassword,
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
  createStaffAccount,
};
