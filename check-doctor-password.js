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

// Check doctor password
const checkDoctorPassword = async () => {
  try {
    console.log('🔍 Checking doctor password...\n');

    // Find doctor user
    const user = await User.findOne({ email: 'doctor@dentalclinic.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Found user:', user.email);
    console.log('🔑 Stored password hash:', user.password);
    console.log('📧 Email:', user.email);
    console.log('👤 Full Name:', user.fullName);
    console.log('🔐 Role:', user.role);

    // Test password
    const testPassword = '123456';
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`\n🧪 Testing password '${testPassword}': ${isMatch ? '✅ Match' : '❌ No match'}`);

    // Try other common passwords
    const commonPasswords = ['password', 'admin', 'doctor', '123456789', 'qwerty'];
    for (const pwd of commonPasswords) {
      const match = await bcrypt.compare(pwd, user.password);
      if (match) {
        console.log(`✅ Found matching password: '${pwd}'`);
        break;
      }
    }

  } catch (error) {
    console.error('❌ Error checking password:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await checkDoctorPassword();
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});

