const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { User, Doctor, Patient, Appointment, Service, DoctorSchedule, Location, MedicalRecord, Prescription, Medicine } = require('../models');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dental_clinic');
    console.log('MongoDB Connected for checking data...');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Check all data
const checkData = async () => {
  try {
    console.log('🔍 Checking database data...\n');
    
    // Count all collections
    const userCount = await User.countDocuments();
    const doctorCount = await Doctor.countDocuments();
    const patientCount = await Patient.countDocuments();
    const appointmentCount = await Appointment.countDocuments();
    const serviceCount = await Service.countDocuments();
    const scheduleCount = await DoctorSchedule.countDocuments();
    const locationCount = await Location.countDocuments();
    const medicalRecordCount = await MedicalRecord.countDocuments();
    const prescriptionCount = await Prescription.countDocuments();
    const medicineCount = await Medicine.countDocuments();
    
    console.log('📊 DATABASE SUMMARY:');
    console.log('==================');
    console.log(`👥 Users: ${userCount}`);
    console.log(`👨‍⚕️ Doctors: ${doctorCount}`);
    console.log(`👤 Patients: ${patientCount}`);
    console.log(`📅 Appointments: ${appointmentCount}`);
    console.log(`🦷 Services: ${serviceCount}`);
    console.log(`📋 Schedules: ${scheduleCount}`);
    console.log(`🏥 Locations: ${locationCount}`);
    console.log(`📋 Medical Records: ${medicalRecordCount}`);
    console.log(`💊 Prescriptions: ${prescriptionCount}`);
    console.log(`💊 Medicines: ${medicineCount}`);
    
    // Get some sample data
    console.log('\n🔑 TEST ACCOUNTS:');
    console.log('================');
    
    const adminUser = await User.findOne({ role: 'admin' });
    const doctorUsers = await User.find({ role: 'doctor' }).limit(3);
    const patientUsers = await User.find({ role: 'patient' }).limit(3);
    
    if (adminUser) {
      console.log(`Admin: ${adminUser.email} / admin123`);
    }
    
    doctorUsers.forEach((user, index) => {
      console.log(`Doctor ${index + 1}: ${user.email} / doctor123`);
    });
    
    patientUsers.forEach((user, index) => {
      console.log(`Patient ${index + 1}: ${user.email} / patient123`);
    });
    
    // Get appointment status summary
    console.log('\n📅 APPOINTMENT STATUS:');
    console.log('=====================');
    
    const appointmentStatus = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    appointmentStatus.forEach(status => {
      console.log(`${status._id}: ${status.count}`);
    });
    
    // Get medical record status summary
    console.log('\n📋 MEDICAL RECORD STATUS:');
    console.log('========================');
    
    const medicalRecordStatus = await MedicalRecord.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    medicalRecordStatus.forEach(status => {
      console.log(`${status._id}: ${status.count}`);
    });
    
    // Get prescription status summary
    console.log('\n💊 PRESCRIPTION STATUS:');
    console.log('======================');
    
    const prescriptionStatus = await Prescription.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    prescriptionStatus.forEach(status => {
      console.log(`${status._id}: ${status.count}`);
    });
    
    // Get recent appointments
    console.log('\n📅 RECENT APPOINTMENTS:');
    console.log('======================');
    
    const recentAppointments = await Appointment.find()
      .populate('doctor', 'user')
      .populate('patient', 'user')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'fullName' }
      })
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'fullName' }
      })
      .sort({ appointmentDate: -1 })
      .limit(5);
    
    recentAppointments.forEach((apt, index) => {
      console.log(`${index + 1}. ${apt.appointmentId} - ${apt.doctor.user.fullName} -> ${apt.patient.user.fullName} (${apt.appointmentDate.toLocaleDateString('vi-VN')} ${apt.startTime}) - ${apt.status}`);
    });
    
    // Get recent medical records
    console.log('\n📋 RECENT MEDICAL RECORDS:');
    console.log('=========================');
    
    const recentMedicalRecords = await MedicalRecord.find()
      .populate('doctor', 'user')
      .populate('patient', 'user')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'fullName' }
      })
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'fullName' }
      })
      .sort({ visitDate: -1 })
      .limit(5);
    
    recentMedicalRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.recordId} - ${record.doctor.user.fullName} -> ${record.patient.user.fullName} (${record.visitDate.toLocaleDateString('vi-VN')}) - ${record.status}`);
    });
    
    console.log('\n✅ Data check completed successfully!');
    console.log('\n🚀 You can now start the application:');
    console.log('1. Backend: npm run dev (in dental-clinic-server)');
    console.log('2. Frontend: npm start (in dental-clinic-client)');
    console.log('3. Login with any of the test accounts above');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking data:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    checkData();
  });
}

module.exports = { checkData };
