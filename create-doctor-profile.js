const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/User');
const Doctor = require('./src/models/Doctor');

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

// Create doctor profile for existing user
const createDoctorProfile = async () => {
  try {
    console.log('🚀 Creating doctor profile for existing user...');

    // Find existing user
    const user = await User.findOne({ email: 'doctor@dentalclinic.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Found user:', user.email);

    // Check if doctor profile already exists
    const existingDoctor = await Doctor.findOne({ user: user._id });
    if (existingDoctor) {
      console.log('⚠️  Doctor profile already exists');
      return;
    }

    // Create doctor profile
    const doctor = new Doctor({
      user: user._id,
      doctorId: 'DOC' + Date.now(),
      specializations: ['Nha khoa tổng quát'],
      education: [{
        degree: 'Bác sĩ Y khoa',
        institution: 'Đại học Y Hà Nội',
        graduationYear: 2015,
        fieldOfStudy: 'Nha khoa'
      }],
      experience: {
        yearsOfPractice: 5,
        previousPositions: [{
          position: 'Bác sĩ nha khoa',
          clinic: 'Bệnh viện Răng Hàm Mặt Trung ương',
          startDate: new Date('2015-01-01'),
          endDate: new Date('2020-01-01'),
          description: 'Chuyên điều trị các bệnh lý răng miệng'
        }]
      },
      biography: 'Bác sĩ chuyên khoa nha khoa với nhiều năm kinh nghiệm',
      languages: ['Tiếng Việt', 'Tiếng Anh'],
      isAcceptingNewPatients: true,
      isActive: true
    });

    await doctor.save();
    console.log('✅ Doctor profile created');

    console.log('\n🎉 Doctor profile created successfully!');
    console.log('📧 Email:', user.email);
    console.log('👤 Doctor ID:', doctor.doctorId);
    console.log('🆔 User ID:', user._id);
    console.log('🆔 Doctor ID:', doctor._id);

  } catch (error) {
    console.error('❌ Error creating doctor profile:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await createDoctorProfile();
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
