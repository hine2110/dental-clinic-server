const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('🧪 Testing login...\n');

    // Login as doctor
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'doctor@dentalclinic.com',
      password: '123456'
    });

    console.log('✅ Login successful');
    console.log('📊 Response data:', JSON.stringify(loginResponse.data, null, 2));

    // Test token verification
    const token = loginResponse.data.token;
    
    // Try to access a protected route
    try {
      const appointmentsResponse = await axios.get('http://localhost:5000/api/doctor/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Token verification successful');
      console.log('📊 Appointments count:', appointmentsResponse.data.appointments.length);
    } catch (error) {
      console.log('❌ Token verification failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Error testing login:', error.response?.data || error.message);
    console.error('❌ Full error:', error);
  }
};

testLogin();
