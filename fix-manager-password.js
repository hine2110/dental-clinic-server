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

// Fix manager password
const fixManagerPassword = async () => {
  try {
    console.log('🔧 Fixing manager password...\n');

    // Hash new password
    const newPassword = '123456';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    console.log('🔑 New password:', newPassword);
    console.log('🔐 Hashed password:', hashedPassword);

    // Update password for manager account
    const result = await User.updateOne(
      { email: 'manager@dentalclinic.com' },
      { $set: { password: hashedPassword } }
    );

    console.log('📊 Update result for manager:', result);

    if (result.modifiedCount > 0) {
      console.log('✅ Manager password updated successfully');

      // Verify password
      const user = await User.findOne({ email: 'manager@dentalclinic.com' }).select('+password');
      const isMatch = await bcrypt.compare(newPassword, user.password);
      console.log(`🧪 Manager password verification: ${isMatch ? '✅ Success' : '❌ Failed'}`);
    } else {
      console.log('❌ No manager documents were updated');
    }

  } catch (error) {
    console.error('❌ Error fixing manager password:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await fixManagerPassword();
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
