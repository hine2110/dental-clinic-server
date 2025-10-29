const axios = require('axios');

const testManagerLogin = async () => {
  try {
    console.log('🧪 Testing manager login...\n');

    // Test manager login
    console.log('--- Testing Manager Login ---');
    const managerLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'manager@dentalclinic.com',
      password: '123456'
    });

    console.log('✅ Manager login successful');
    console.log('📧 Email:', managerLoginResponse.data.data.user.email);
    console.log('👤 Role:', managerLoginResponse.data.data.user.role);
    console.log('🔑 Token length:', managerLoginResponse.data.data.token.length);

    // Test all accounts
    console.log('\n--- Testing All Accounts ---');
    
    const accounts = [
      { name: 'Doctor', email: 'doctor@dentalclinic.com', password: '123456' },
      { name: 'Receptionist', email: 'staff@dentalclinic.com', password: '123456' },
      { name: 'Store Keeper', email: 'keeper@dentalclinic.com', password: '123456' },
      { name: 'Manager', email: 'manager@dentalclinic.com', password: '123456' }
    ];

    for (const account of accounts) {
      try {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
          email: account.email,
          password: account.password
        });
        console.log(`✅ ${account.name} login: SUCCESS`);
      } catch (error) {
        console.log(`❌ ${account.name} login: FAILED - ${error.response?.data?.message || error.message}`);
      }
    }

    console.log('\n🎉 All account tests completed!');

  } catch (error) {
    console.error('❌ Error testing manager login:', error.response?.data || error.message);
  }
};

testManagerLogin();
