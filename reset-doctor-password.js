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

// Reset doctor password
const resetDoctorPassword = async () => {
  try {
    console.log('🔧 Resetting doctor password...\n');

    // Hash new password
    const newPassword = '123456';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    console.log('🔑 New password:', newPassword);
    console.log('🔐 Hashed password:', hashedPassword);

    // Update password directly in database
    const result = await User.updateOne(
      { email: 'doctor@dentalclinic.com' },
      { $set: { password: hashedPassword } }
    );

    console.log('📊 Update result:', result);

    if (result.modifiedCount > 0) {
      console.log('✅ Password updated successfully');

      // Verify password
      const user = await User.findOne({ email: 'doctor@dentalclinic.com' }).select('+password');
      const isMatch = await bcrypt.compare(newPassword, user.password);
      console.log(`🧪 Password verification: ${isMatch ? '✅ Success' : '❌ Failed'}`);
    } else {
      console.log('❌ No documents were updated');
    }

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await resetDoctorPassword();
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});

