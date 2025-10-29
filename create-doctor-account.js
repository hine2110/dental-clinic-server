const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

// Create doctor account
const createDoctorAccount = async () => {
  try {
    console.log('🚀 Creating doctor account...');

    // Doctor account data
    const doctorData = {
      fullName: 'Bác sĩ Nguyễn Văn A',
      email: 'doctor@dentalclinic.com',
      phone: '0123456789',
      password: '123456',
      role: 'doctor'
    };

    // Check if user already exists
    const existingUser = await User.findOne({ email: doctorData.email });
    if (existingUser) {
      console.log('⚠️  User already exists with this email');
      return;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(doctorData.password, saltRounds);

    // Create user account
    const user = new User({
      fullName: doctorData.fullName,
      email: doctorData.email,
      phone: doctorData.phone,
      password: hashedPassword,
      role: doctorData.role,
      isEmailVerified: true
    });

    await user.save();
    console.log('✅ User account created:', user.email);

    // Create doctor profile
    const doctor = new Doctor({
      user: user._id,
      doctorId: 'DOC001',
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

    console.log('\n🎉 Doctor account created successfully!');
    console.log('📧 Email:', doctorData.email);
    console.log('🔑 Password:', doctorData.password);
    console.log('👤 Doctor ID:', doctor.doctorId);
    console.log('🆔 User ID:', user._id);
    console.log('🆔 Doctor ID:', doctor._id);

  } catch (error) {
    console.error('❌ Error creating doctor account:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await createDoctorAccount();
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
