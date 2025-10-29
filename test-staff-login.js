const axios = require('axios');

const testStaffLogin = async () => {
  try {
    console.log('🧪 Testing staff login...\n');

    // Test staff login
    console.log('--- Testing Receptionist Login ---');
    const staffLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'staff@dentalclinic.com',
      password: '123456'
    });

    console.log('✅ Staff login successful');
    console.log('📧 Email:', staffLoginResponse.data.data.user.email);
    console.log('👤 Role:', staffLoginResponse.data.data.user.role);
    console.log('🔑 Token length:', staffLoginResponse.data.data.token.length);

    // Test store keeper login
    console.log('\n--- Testing Store Keeper Login ---');
    const keeperLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'keeper@dentalclinic.com',
      password: '123456'
    });

    console.log('✅ Store keeper login successful');
    console.log('📧 Email:', keeperLoginResponse.data.data.user.email);
    console.log('👤 Role:', keeperLoginResponse.data.data.user.role);
    console.log('🔑 Token length:', keeperLoginResponse.data.data.token.length);

    // Test doctor login
    console.log('\n--- Testing Doctor Login ---');
    const doctorLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'doctor@dentalclinic.com',
      password: '123456'
    });

    console.log('✅ Doctor login successful');
    console.log('📧 Email:', doctorLoginResponse.data.data.user.email);
    console.log('👤 Role:', doctorLoginResponse.data.data.user.role);
    console.log('🔑 Token length:', doctorLoginResponse.data.data.token.length);

    console.log('\n🎉 All login tests passed successfully!');

  } catch (error) {
    console.error('❌ Error testing login:', error.response?.data || error.message);
  }
};

testStaffLogin();
