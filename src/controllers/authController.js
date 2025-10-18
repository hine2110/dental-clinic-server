const { User, Patient, Doctor } = require("../models");
const { generateToken } = require("../middlewares/auth");
const bcrypt = require("bcryptjs");

const login = async (req, res) => {
  try {
    console.log("🔐 Login request body:", req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    console.log("🔍 User found:", !!user);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    
    console.log("🔍 User details:", {
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      passwordExists: !!user.password,
      passwordLength: user.password?.length
    });

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    console.log("🔐 Password comparison:", {
      providedPassword: password,
      storedPasswordLength: user.password?.length,
      passwordMatch: await bcrypt.compare(password, user.password)
    });
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("❌ Password validation failed");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    
    console.log("✅ Password validation successful");

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get additional profile data based on role
    let profileData = {};
    if (user.role === "doctor") {
      const doctorProfile = await Doctor.findOne({ user: user._id });
      if (doctorProfile) {
        profileData = {
          doctorId: doctorProfile.doctorId,
          specializations: doctorProfile.specializations,
          consultationFee: doctorProfile.consultationFee,
        };
      }
    } else if (user.role === "patient") {
      const patientProfile = await Patient.findOne({ user: user._id });
      if (patientProfile) {
        profileData = {
          patientId: patientProfile.patientId,
          emergencyContact: patientProfile.emergencyContact,
        };
      }
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          lastLogin: user.lastLogin,
        },
        profile: profileData,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = req.user;

    let profileData = {};
    if (user.role === "doctor") {
      const doctorProfile = await Doctor.findOne({ user: user._id });
      if (doctorProfile) {
        profileData = {
          doctorId: doctorProfile.doctorId,
          specializations: doctorProfile.specializations,
          consultationFee: doctorProfile.consultationFee,
          workSchedule: doctorProfile.workSchedule,
          isAcceptingNewPatients: doctorProfile.isAcceptingNewPatients,
        };
      }
    } else if (user.role === "patient") {
      const patientProfile = await Patient.findOne({ user: user._id });
      if (patientProfile) {
        profileData = {
          patientId: patientProfile.patientId,
          emergencyContact: patientProfile.emergencyContact,
          medicalHistory: patientProfile.medicalHistory,
          dentalHistory: patientProfile.dentalHistory,
        };
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
          avatar: user.avatar,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
        },
        profile: profileData,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting user info",
    });
  }
};

const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};

module.exports = {
  login,
  getMe,
  logout,
};
