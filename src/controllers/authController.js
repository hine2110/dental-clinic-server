const { User, Patient, Doctor } = require('../models');
const { generateToken } = require('../middlewares/auth');

// @desc    Register new user (Patient)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, dateOfBirth, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user account
    const user = await User.create({
      email,
      password,
      role: 'patient', // Default role for registration
      firstName,
      lastName,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address: address || {}
    });

    // Create patient profile
    const patient = await Patient.create({
      user: user._id,
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      }
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
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
          avatar: user.avatar
        },
        profile: {
          patientId: patient.patientId
        }
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login  
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email (include password for comparison)
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get additional profile data based on role
    let profileData = {};
    
    if (user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: user._id });
      if (doctorProfile) {
        profileData = {
          doctorId: doctorProfile.doctorId,
          specializations: doctorProfile.specializations,
          consultationFee: doctorProfile.consultationFee
        };
      }
    } else if (user.role === 'patient') {
      const patientProfile = await Patient.findOne({ user: user._id });
      if (patientProfile) {
        profileData = {
          patientId: patientProfile.patientId,
          emergencyContact: patientProfile.emergencyContact
        };
      }
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
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
          lastLogin: user.lastLogin
        },
        profile: profileData
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current user info
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = req.user; // From auth middleware
    
    // Get additional profile data based on role
    let profileData = {};
    
    if (user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: user._id });
      if (doctorProfile) {
        profileData = {
          doctorId: doctorProfile.doctorId,
          specializations: doctorProfile.specializations,
          consultationFee: doctorProfile.consultationFee,
          workSchedule: doctorProfile.workSchedule,
          isAcceptingNewPatients: doctorProfile.isAcceptingNewPatients
        };
      }
    } else if (user.role === 'patient') {
      const patientProfile = await Patient.findOne({ user: user._id });
      if (patientProfile) {
        profileData = {
          patientId: patientProfile.patientId,
          emergencyContact: patientProfile.emergencyContact,
          medicalHistory: patientProfile.medicalHistory,
          dentalHistory: patientProfile.dentalHistory
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
          lastLogin: user.lastLogin
        },
        profile: profileData
      }
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting user info'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a more advanced implementation, you would:
    // 1. Add token to blacklist
    // 2. Clear refresh tokens from database
    // 3. Clear session data
    
    // For now, we'll just send success response
    // The client should remove the token from storage
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// @desc    Create account (Admin/Staff only)
// @route   POST /api/auth/create-account
// @access  Private (Admin/Staff)
const createAccount = async (req, res) => {
  try {
    const { email, role, firstName, lastName, phone, specializations, temporaryPassword } = req.body;
    
    // Check if user has permission to create accounts
    if (req.user.role !== 'admin' && req.user.role !== 'receptionist') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Only admin and staff can create accounts.'
      });
    }

    // Validate role
    const allowedRoles = ['doctor', 'receptionist'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed roles: doctor, receptionist'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate temporary password if not provided
    const password = temporaryPassword || `temp${Math.random().toString(36).slice(-8)}`;

    // Create user account
    const user = await User.create({
      email,
      password,
      role,
      firstName,
      lastName,
      phone
    });

    // Create role-specific profile
    let profileData = {};
    
    if (role === 'doctor') {
      const doctor = await Doctor.create({
        user: user._id,
        credentials: {
          medicalLicense: '',
          dentalLicense: ''
        },
        education: [],
        specializations: specializations || ['General Dentistry'],
        experience: { yearsOfPractice: 0 },
        consultationFee: { amount: 200000, currency: 'VND' },
        workSchedule: [
          { dayOfWeek: 'Monday', startTime: '08:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 'Tuesday', startTime: '08:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 'Wednesday', startTime: '08:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 'Thursday', startTime: '08:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 'Friday', startTime: '08:00', endTime: '17:00', isAvailable: true }
        ]
      });
      
      profileData = {
        doctorId: doctor.doctorId,
        specializations: doctor.specializations
      };
    }

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone
        },
        profile: profileData,
        temporaryPassword: password,
        note: 'Please change password on first login'
      }
    });

  } catch (error) {
    console.error('Create account error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating account'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  createAccount,
  changePassword
};
