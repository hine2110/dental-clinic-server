const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

// Fix doctor password
const fixDoctorPassword = async () => {
  try {
    console.log('🔧 Fixing doctor password...\n');

    // Find doctor user
    const user = await User.findOne({ email: 'doctor@dentalclinic.com' }).select('+password');
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Found user:', user.email);

    // Hash new password
    const newPassword = '123456';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password updated successfully');
    console.log('📧 Email:', user.email);
    console.log('🔑 New password:', newPassword);
    console.log('🔑 Hashed password:', user.password);

    // Verify password
    const isMatch = await bcrypt.compare(newPassword, user.password);
    console.log(`🧪 Password verification: ${isMatch ? '✅ Success' : '❌ Failed'}`);

    // Re-fetch user to verify
    const updatedUser = await User.findOne({ email: 'doctor@dentalclinic.com' }).select('+password');
    console.log('🔍 Re-fetched password hash:', updatedUser.password);
    const reVerify = await bcrypt.compare(newPassword, updatedUser.password);
    console.log(`🧪 Re-verification: ${reVerify ? '✅ Success' : '❌ Failed'}`);

  } catch (error) {
    console.error('❌ Error fixing password:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await fixDoctorPassword();
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
