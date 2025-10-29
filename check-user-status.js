const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/User');

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

// Check user status
const checkUserStatus = async () => {
  try {
    console.log('🔍 Checking user status...\n');

    // Find doctor user
    const user = await User.findOne({ email: 'doctor@dentalclinic.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Found user:', user.email);
    console.log('👤 Full Name:', user.fullName);
    console.log('🔐 Role:', user.role);
    console.log('✅ Is Active:', user.isActive);
    console.log('📧 Email Verified:', user.isEmailVerified);
    console.log('📅 Created At:', user.createdAt);
    console.log('📅 Updated At:', user.updatedAt);

    // Check if isActive field exists
    console.log('\n🔍 Checking isActive field:');
    console.log('isActive in schema:', user.schema.paths.isActive ? '✅ Exists' : '❌ Missing');
    console.log('isActive value:', user.isActive);
    console.log('isActive type:', typeof user.isActive);

  } catch (error) {
    console.error('❌ Error checking user status:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await checkUserStatus();
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});

