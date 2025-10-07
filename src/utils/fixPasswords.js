const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const { User } = require('../models');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dental_clinic');
    console.log('MongoDB Connected for fixing passwords...');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Fix passwords
const fixPasswords = async () => {
  try {
    console.log('🔐 Fixing user passwords...\n');
    
    // Get all users with plain text passwords
    const users = await User.find({}).select('+password');
    
    console.log(`Found ${users.length} users to fix`);
    
    for (const user of users) {
      // Check if password is already hashed (starts with $2a$)
      if (user.password && !user.password.startsWith('$2a$')) {
        console.log(`Fixing password for: ${user.email}`);
        
        // Hash the plain text password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        
        // Update the user with hashed password
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });
        
        console.log(`✅ Fixed password for: ${user.email}`);
      } else {
        console.log(`⏭️  Password already hashed for: ${user.email}`);
      }
    }
    
    // Test login after fixing
    console.log('\n🧪 Testing login after fix...');
    
    const testUser = await User.findOne({ email: 'doctor1@dentalclinic.com' }).select('+password');
    const isPasswordValid = await bcrypt.compare('doctor123', testUser.password);
    
    if (isPasswordValid) {
      console.log('✅ Login test PASSED after fix');
    } else {
      console.log('❌ Login test FAILED after fix');
    }
    
    console.log('\n🎉 Password fixing completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    fixPasswords();
  });
}

module.exports = { fixPasswords };
