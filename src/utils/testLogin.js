const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const { User } = require('../models');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dental_clinic');
    console.log('MongoDB Connected for testing login...');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Test login
const testLogin = async () => {
  try {
    console.log('🔐 Testing login functionality...\n');
    
    // Test doctor login
    const doctorEmail = 'doctor1@dentalclinic.com';
    const doctorPassword = 'doctor123';
    
    console.log(`Testing login for: ${doctorEmail}`);
    
    const user = await User.findOne({ email: doctorEmail }).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    
    // Test password
    const isPasswordValid = await bcrypt.compare(doctorPassword, user.password);
    console.log('Password valid:', isPasswordValid);
    
    if (isPasswordValid) {
      console.log('✅ Login test PASSED');
    } else {
      console.log('❌ Login test FAILED - Password mismatch');
      
      // Show what's in the database
      console.log('Stored password hash:', user.password);
      
      // Try to hash the password again
      const newHash = await bcrypt.hash(doctorPassword, 10);
      console.log('New password hash:', newHash);
      
      // Test with new hash
      const testWithNewHash = await bcrypt.compare(doctorPassword, newHash);
      console.log('Test with new hash:', testWithNewHash);
    }
    
    // Test other users
    console.log('\n🔍 Checking all users:');
    const allUsers = await User.find({}, 'email role isActive');
    allUsers.forEach((u, index) => {
      console.log(`${index + 1}. ${u.email} (${u.role}) - Active: ${u.isActive}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing login:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    testLogin();
  });
}

module.exports = { testLogin };
