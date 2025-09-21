const { User, Patient, Doctor } = require("../models");
const createAccount = async (req, res) => {
  try {
    const {
      email,
      role,
      firstName,
      lastName,
      phone,
      specializations,
      temporaryPassword,
    } = req.body;

    // Check if user has permission to create accounts (Admin only)
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Permission denied. Only admin can create staff accounts.",
      });
    }

    // Validate role - only doctor and receptionist
    const allowedRoles = ["doctor", "receptionist"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Allowed roles: doctor, receptionist",
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

    const password =
      temporaryPassword || `temp${Math.random().toString(36).slice(-8)}`;

    // Create user account
    const user = await User.create({
      email,
      password,
      role,
      fullName: `${firstName} ${lastName}`.trim(),
      phone,
    });

    console.log("User created successfully:", user._id);

    // Create role-specific profile
    let profileData = {};

    if (role === "doctor") {
      try {
        const doctor = await Doctor.create({
          user: user._id,
          license: "DDS2024001", // Default license
          specializations: specializations || "General Dentistry",
          workSchedule: "Monday-Friday: 08:00-17:00",
          consultationFee: 200000,
        });

        console.log("Doctor profile created successfully:", doctor._id);

        profileData = {
          doctorId: doctor.doctorId,
          specializations: doctor.specializations,
        };
      } catch (doctorError) {
        console.error("Error creating doctor profile:", doctorError);
        // Rollback user creation if doctor profile fails
        await User.findByIdAndDelete(user._id);
        throw doctorError;
      }
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
        profile: profileData,
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
  createAccount,
};
