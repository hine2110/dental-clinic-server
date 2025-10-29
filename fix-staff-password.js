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

// Fix staff password
const fixStaffPassword = async () => {
  try {
    console.log('🔧 Fixing staff password...\n');

    // Hash new password
    const newPassword = '123456';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    console.log('🔑 New password:', newPassword);
    console.log('🔐 Hashed password:', hashedPassword);

    // Update password for staff account
    const result = await User.updateOne(
      { email: 'staff@dentalclinic.com' },
      { $set: { password: hashedPassword } }
    );

    console.log('📊 Update result for staff:', result);

    if (result.modifiedCount > 0) {
      console.log('✅ Staff password updated successfully');

      // Verify password
      const user = await User.findOne({ email: 'staff@dentalclinic.com' }).select('+password');
      const isMatch = await bcrypt.compare(newPassword, user.password);
      console.log(`🧪 Staff password verification: ${isMatch ? '✅ Success' : '❌ Failed'}`);
    } else {
      console.log('❌ No staff documents were updated');
    }

    // Update password for store keeper account
    const result2 = await User.updateOne(
      { email: 'keeper@dentalclinic.com' },
      { $set: { password: hashedPassword } }
    );

    console.log('📊 Update result for keeper:', result2);

    if (result2.modifiedCount > 0) {
      console.log('✅ Store keeper password updated successfully');

      // Verify password
      const user2 = await User.findOne({ email: 'keeper@dentalclinic.com' }).select('+password');
      const isMatch2 = await bcrypt.compare(newPassword, user2.password);
      console.log(`🧪 Store keeper password verification: ${isMatch2 ? '✅ Success' : '❌ Failed'}`);
    } else {
      console.log('❌ No store keeper documents were updated');
    }

  } catch (error) {
    console.error('❌ Error fixing staff password:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await fixStaffPassword();
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
