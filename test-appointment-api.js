const axios = require('axios');

const testAppointmentAPI = async () => {
  try {
    console.log('🧪 Testing appointment API...\n');

    // First, login as a doctor
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'doctor@dentalclinic.com',
      password: '123456'
    });

    const token = loginResponse.data.token;
    console.log('✅ Doctor login successful');

    // Get doctor's appointments
    const appointmentsResponse = await axios.get('http://localhost:5000/api/doctor/appointments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`📊 Found ${appointmentsResponse.data.appointments.length} appointments\n`);

    // Get details of the first appointment
    if (appointmentsResponse.data.appointments.length > 0) {
      const firstAppointment = appointmentsResponse.data.appointments[0];
      console.log('--- First Appointment Details ---');
      console.log(`🆔 Appointment ID: ${firstAppointment.appointmentId}`);
      console.log(`👤 Patient Name (user): ${firstAppointment.patient?.user?.fullName || 'undefined'}`);
      console.log(`👤 Patient Name (basicInfo): ${firstAppointment.patient?.basicInfo?.fullName || 'undefined'}`);
      console.log(`🎂 Date of Birth: ${firstAppointment.patient?.basicInfo?.dateOfBirth ? new Date(firstAppointment.patient.basicInfo.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'}`);
      console.log(`⚧ Gender: ${firstAppointment.patient?.basicInfo?.gender || 'N/A'}`);
      console.log(`📧 Email: ${firstAppointment.patient?.contactInfo?.email || firstAppointment.patient?.user?.email || 'N/A'}`);
      console.log(`📞 Phone: ${firstAppointment.patient?.contactInfo?.phone || 'N/A'}`);
      console.log(`🏠 Address: ${firstAppointment.patient?.contactInfo?.address ? 
        `${firstAppointment.patient.contactInfo.address.street}, ${firstAppointment.patient.contactInfo.address.city}, ${firstAppointment.patient.contactInfo.address.state}` : 
        'N/A'}`);
      console.log(`📅 Appointment Date: ${firstAppointment.appointmentDate ? new Date(firstAppointment.appointmentDate).toLocaleDateString('vi-VN') : 'N/A'}`);
      console.log(`📊 Status: ${firstAppointment.status}`);

      // Test getting specific appointment details
      console.log('\n--- Testing getAppointmentDetails API ---');
      const appointmentDetailsResponse = await axios.get(`http://localhost:5000/api/doctor/appointments/${firstAppointment._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const appointmentDetails = appointmentDetailsResponse.data.appointment;
      console.log(`🆔 Appointment ID: ${appointmentDetails.appointmentId}`);
      console.log(`👤 Patient Name (user): ${appointmentDetails.patient?.user?.fullName || 'undefined'}`);
      console.log(`👤 Patient Name (basicInfo): ${appointmentDetails.patient?.basicInfo?.fullName || 'undefined'}`);
      console.log(`🎂 Date of Birth: ${appointmentDetails.patient?.basicInfo?.dateOfBirth ? new Date(appointmentDetails.patient.basicInfo.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'}`);
      console.log(`⚧ Gender: ${appointmentDetails.patient?.basicInfo?.gender || 'N/A'}`);
      console.log(`📧 Email: ${appointmentDetails.patient?.contactInfo?.email || appointmentDetails.patient?.user?.email || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
  }
};

testAppointmentAPI();

