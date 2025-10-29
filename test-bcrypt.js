const bcrypt = require('bcryptjs');

const testBcrypt = async () => {
  try {
    console.log('🧪 Testing bcrypt...\n');

    const password = '123456';
    console.log('🔑 Original password:', password);

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('🔐 Hashed password:', hashedPassword);

    // Verify password
    const isMatch = await bcrypt.compare(password, hashedPassword);
    console.log(`🧪 Password verification: ${isMatch ? '✅ Success' : '❌ Failed'}`);

    // Test with different password
    const wrongPassword = 'wrongpassword';
    const isWrongMatch = await bcrypt.compare(wrongPassword, hashedPassword);
    console.log(`🧪 Wrong password test: ${isWrongMatch ? '❌ Should fail' : '✅ Correctly failed'}`);

  } catch (error) {
    console.error('❌ Error testing bcrypt:', error);
  }
};

testBcrypt();

