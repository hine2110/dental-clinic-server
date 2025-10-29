const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./src/models/User');
const Management = require('./src/models/Management');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dental-clinic', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create manager account
const createManagerAccount = async () => {
  try {
    console.log('🚀 Creating manager account...');

    // Manager account data
    const managerData = {
      fullName: 'Quản lý Nguyễn Văn B',
      email: 'manager@dentalclinic.com',
      phone: '0987654321',
      password: '123456',
      role: 'management'
    };

    // Check if user already exists
    const existingUser = await User.findOne({ email: managerData.email });
    if (existingUser) {
      console.log('⚠️  User already exists with this email');
      return;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(managerData.password, saltRounds);

    // Create user account
    const user = new User({
      fullName: managerData.fullName,
      email: managerData.email,
      phone: managerData.phone,
      password: hashedPassword,
      role: managerData.role,
      isEmailVerified: true
    });

    await user.save();
    console.log('✅ User account created:', user.email);

    // Create management profile
    const management = new Management({
      user: user._id,
      managementId: 'MGR' + Date.now(),
      department: 'Quản lý tổng thể',
      position: 'Giám đốc điều hành',
      permissions: {
        // User management
        viewAllUsers: true,
        createUsers: true,
        updateUsers: true,
        deleteUsers: true,
        
        // Doctor management
        viewAllDoctors: true,
        createDoctors: true,
        updateDoctors: true,
        deleteDoctors: true,
        manageDoctorSchedules: true,
        
        // Staff management
        viewAllStaff: true,
        createStaff: true,
        updateStaff: true,
        deleteStaff: true,
        manageStaffSchedules: true,
        
        // Patient management
        viewAllPatients: true,
        viewPatientDetails: true,
        updatePatientInfo: true,
        
        // Appointment management
        viewAllAppointments: true,
        createAppointments: true,
        updateAppointments: true,
        cancelAppointments: true,
        rescheduleAppointments: true,
        
        // Service management
        viewAllServices: true,
        createServices: true,
        updateServices: true,
        deleteServices: true,
        
        // Financial management
        viewFinancialReports: true,
        viewInvoices: true,
        createInvoices: true,
        updateInvoices: true,
        deleteInvoices: true,
        
        // System management
        viewSystemSettings: true,
        updateSystemSettings: true,
        viewAuditLogs: true,
        backupData: true,
        
        // Reports
        generateReports: true,
        exportData: true,
        viewAnalytics: true
      },
      isActive: true
    });

    await management.save();
    console.log('✅ Management profile created');

    console.log('\n🎉 Manager account created successfully!');
    console.log('📧 Email:', managerData.email);
    console.log('🔑 Password:', managerData.password);
    console.log('👤 Management ID:', management.managementId);
    console.log('🆔 User ID:', user._id);
    console.log('🆔 Management ID:', management._id);

  } catch (error) {
    console.error('❌ Error creating manager account:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await createManagerAccount();
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
