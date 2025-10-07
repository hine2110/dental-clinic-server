const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const { User, Doctor, Patient, Appointment, Service, DoctorSchedule, Location, MedicalRecord } = require('../models');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dental_clinic');
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  try {
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await Appointment.deleteMany({});
    await Service.deleteMany({});
    await DoctorSchedule.deleteMany({});
    await Location.deleteMany({});
    await MedicalRecord.deleteMany({});
    console.log('✅ Data cleared successfully');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};

// Create locations
const createLocations = async () => {
  try {
    console.log('🏥 Creating locations...');
    const locations = [
      {
        name: 'Phòng khám Nha khoa Hà Nội',
        address: {
          street: '123 Đường Láng',
          city: 'Hà Nội',
          state: 'Hà Nội',
          zipCode: '100000',
          country: 'Việt Nam'
        },
        phone: '024-1234-5678',
        email: 'hanoi@dentalclinic.com',
        isActive: true
      },
      {
        name: 'Phòng khám Nha khoa TP.HCM',
        address: {
          street: '456 Đường Nguyễn Huệ',
          city: 'TP.HCM',
          state: 'TP.HCM',
          zipCode: '700000',
          country: 'Việt Nam'
        },
        phone: '028-8765-4321',
        email: 'hcm@dentalclinic.com',
        isActive: true
      }
    ];

    const createdLocations = await Location.insertMany(locations);
    console.log('✅ Locations created:', createdLocations.length);
    return createdLocations;
  } catch (error) {
    console.error('Error creating locations:', error);
    return [];
  }
};

// Create users (doctors, patients, admin)
const createUsers = async () => {
  try {
    console.log('👥 Creating users...');
    
    // Admin user
    const adminUser = new User({
      fullName: 'Nguyễn Văn Admin',
      email: 'admin@dentalclinic.com',
      password: 'admin123',
      role: 'admin',
      phone: '0123456789',
      isActive: true,
      isProfileComplete: true
    });
    await adminUser.save();

    // Doctor users
    const doctorUsers = [
      {
        fullName: 'Bác sĩ Nguyễn Văn A',
        email: 'doctor1@dentalclinic.com',
        password: 'doctor123',
        role: 'doctor',
        phone: '0987654321',
        isActive: true,
        isProfileComplete: true
      },
      {
        fullName: 'Bác sĩ Trần Thị B',
        email: 'doctor2@dentalclinic.com',
        password: 'doctor123',
        role: 'doctor',
        phone: '0987654322',
        isActive: true,
        isProfileComplete: true
      },
      {
        fullName: 'Bác sĩ Lê Văn C',
        email: 'doctor3@dentalclinic.com',
        password: 'doctor123',
        role: 'doctor',
        phone: '0987654323',
        isActive: true,
        isProfileComplete: true
      }
    ];

    const createdDoctorUsers = await User.insertMany(doctorUsers);

    // Patient users
    const patientUsers = [
      {
        fullName: 'Nguyễn Thị D',
        email: 'patient1@example.com',
        password: 'patient123',
        role: 'patient',
        phone: '0912345678',
        isActive: true,
        isProfileComplete: true
      },
      {
        fullName: 'Trần Văn E',
        email: 'patient2@example.com',
        password: 'patient123',
        role: 'patient',
        phone: '0912345679',
        isActive: true,
        isProfileComplete: true
      },
      {
        fullName: 'Lê Thị F',
        email: 'patient3@example.com',
        password: 'patient123',
        role: 'patient',
        phone: '0912345680',
        isActive: true,
        isProfileComplete: true
      },
      {
        fullName: 'Phạm Văn G',
        email: 'patient4@example.com',
        password: 'patient123',
        role: 'patient',
        phone: '0912345681',
        isActive: true,
        isProfileComplete: true
      },
      {
        fullName: 'Hoàng Thị H',
        email: 'patient5@example.com',
        password: 'patient123',
        role: 'patient',
        phone: '0912345682',
        isActive: true,
        isProfileComplete: true
      }
    ];

    const createdPatientUsers = await User.insertMany(patientUsers);

    console.log('✅ Users created:', createdDoctorUsers.length + createdPatientUsers.length + 1);
    return { adminUser, doctorUsers: createdDoctorUsers, patientUsers: createdPatientUsers };
  } catch (error) {
    console.error('Error creating users:', error);
    return { adminUser: null, doctorUsers: [], patientUsers: [] };
  }
};

// Create doctor profiles
const createDoctors = async (doctorUsers, locations) => {
  try {
    console.log('👨‍⚕️ Creating doctor profiles...');
    
    const doctors = [
      {
        user: doctorUsers[0]._id,
        doctorId: 'DOC001',
        credentials: {
          medicalLicense: 'MD-2024-001',
          dentalLicense: 'DDS-2024-001',
          certifications: [
            {
              name: 'Chứng chỉ Nha khoa Tổng quát',
              issuedBy: 'Bộ Y tế Việt Nam',
              dateIssued: new Date('2020-01-01'),
              expirationDate: new Date('2025-01-01')
            }
          ]
        },
        education: [
          {
            degree: 'Bác sĩ Răng Hàm Mặt',
            institution: 'Đại học Y Hà Nội',
            graduationYear: 2018,
            fieldOfStudy: 'Nha khoa'
          }
        ],
        specializations: ['Nha khoa Tổng quát', 'Nha khoa Thẩm mỹ', 'Chỉnh nha'],
        experience: {
          yearsOfPractice: 6,
          previousPositions: [
            {
              position: 'Bác sĩ Nha khoa',
              clinic: 'Bệnh viện Răng Hàm Mặt Trung ương',
              startDate: new Date('2018-06-01'),
              endDate: new Date('2022-12-31'),
              description: 'Khám và điều trị các bệnh răng miệng'
            }
          ]
        },
        biography: 'Bác sĩ có hơn 6 năm kinh nghiệm trong lĩnh vực nha khoa, chuyên về nha khoa tổng quát và thẩm mỹ.',
        languages: ['Tiếng Việt', 'Tiếng Anh'],
        isAcceptingNewPatients: true,
        isActive: true,
        consultationFee: 200000,
        workSchedule: {
          monday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          tuesday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          wednesday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          thursday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          friday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          saturday: { startTime: '08:00', endTime: '12:00', isWorking: true },
          sunday: { startTime: '08:00', endTime: '12:00', isWorking: false }
        },
        rating: 4.8,
        totalRatings: 25,
        availability: {
          isOnline: true,
          lastSeen: new Date(),
          status: 'available'
        }
      },
      {
        user: doctorUsers[1]._id,
        doctorId: 'DOC002',
        credentials: {
          medicalLicense: 'MD-2024-002',
          dentalLicense: 'DDS-2024-002',
          certifications: [
            {
              name: 'Chứng chỉ Nha khoa Trẻ em',
              issuedBy: 'Bộ Y tế Việt Nam',
              dateIssued: new Date('2021-01-01'),
              expirationDate: new Date('2026-01-01')
            }
          ]
        },
        education: [
          {
            degree: 'Bác sĩ Răng Hàm Mặt',
            institution: 'Đại học Y TP.HCM',
            graduationYear: 2019,
            fieldOfStudy: 'Nha khoa Trẻ em'
          }
        ],
        specializations: ['Nha khoa Trẻ em', 'Nha khoa Tổng quát'],
        experience: {
          yearsOfPractice: 5,
          previousPositions: [
            {
              position: 'Bác sĩ Nha khoa Trẻ em',
              clinic: 'Bệnh viện Nhi Đồng 1',
              startDate: new Date('2019-07-01'),
              endDate: new Date('2023-12-31'),
              description: 'Chuyên khám và điều trị răng miệng cho trẻ em'
            }
          ]
        },
        biography: 'Bác sĩ chuyên về nha khoa trẻ em với hơn 5 năm kinh nghiệm.',
        languages: ['Tiếng Việt', 'Tiếng Anh'],
        isAcceptingNewPatients: true,
        isActive: true,
        consultationFee: 180000,
        workSchedule: {
          monday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          tuesday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          wednesday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          thursday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          friday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          saturday: { startTime: '08:00', endTime: '12:00', isWorking: true },
          sunday: { startTime: '08:00', endTime: '12:00', isWorking: false }
        },
        rating: 4.9,
        totalRatings: 18,
        availability: {
          isOnline: true,
          lastSeen: new Date(),
          status: 'available'
        }
      },
      {
        user: doctorUsers[2]._id,
        doctorId: 'DOC003',
        credentials: {
          medicalLicense: 'MD-2024-003',
          dentalLicense: 'DDS-2024-003',
          certifications: [
            {
              name: 'Chứng chỉ Chỉnh nha',
              issuedBy: 'Bộ Y tế Việt Nam',
              dateIssued: new Date('2022-01-01'),
              expirationDate: new Date('2027-01-01')
            }
          ]
        },
        education: [
          {
            degree: 'Bác sĩ Răng Hàm Mặt',
            institution: 'Đại học Y Hà Nội',
            graduationYear: 2020,
            fieldOfStudy: 'Chỉnh nha'
          }
        ],
        specializations: ['Chỉnh nha', 'Nha khoa Thẩm mỹ'],
        experience: {
          yearsOfPractice: 4,
          previousPositions: [
            {
              position: 'Bác sĩ Chỉnh nha',
              clinic: 'Phòng khám Nha khoa Thẩm mỹ',
              startDate: new Date('2020-08-01'),
              endDate: new Date('2024-01-31'),
              description: 'Chuyên về chỉnh nha và nha khoa thẩm mỹ'
            }
          ]
        },
        biography: 'Bác sĩ chuyên về chỉnh nha với hơn 4 năm kinh nghiệm.',
        languages: ['Tiếng Việt', 'Tiếng Anh', 'Tiếng Hàn'],
        isAcceptingNewPatients: true,
        isActive: true,
        consultationFee: 300000,
        workSchedule: {
          monday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          tuesday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          wednesday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          thursday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          friday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          saturday: { startTime: '08:00', endTime: '12:00', isWorking: true },
          sunday: { startTime: '08:00', endTime: '12:00', isWorking: false }
        },
        rating: 4.7,
        totalRatings: 12,
        availability: {
          isOnline: false,
          lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          status: 'away'
        }
      }
    ];

    const createdDoctors = await Doctor.insertMany(doctors);
    console.log('✅ Doctor profiles created:', createdDoctors.length);
    return createdDoctors;
  } catch (error) {
    console.error('Error creating doctors:', error);
    return [];
  }
};

// Create patient profiles
const createPatients = async (patientUsers) => {
  try {
    console.log('👤 Creating patient profiles...');
    
    const patients = [
      {
        user: patientUsers[0]._id,
        basicInfo: {
          fullName: 'Nguyễn Thị D',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'female',
          idCard: {
            idNumber: '123456789'
          }
        },
        medicalHistory: [
          {
            condition: 'Viêm nướu',
            year: 2022,
            notes: 'Đã điều trị thành công'
          },
          {
            condition: 'Sâu răng',
            year: 2021,
            notes: 'Trám răng số 6'
          }
        ],
        allergies: [
          {
            allergen: 'Penicillin',
            severity: 'Nhẹ',
            reaction: 'Phát ban nhẹ'
          }
        ],
        contactInfo: {
          phone: '0912345678',
          email: 'patient1@example.com',
          address: {
            street: '123 Đường ABC',
            city: 'Hà Nội',
            state: 'Hà Nội',
            zipCode: '100000',
            country: 'Việt Nam'
          }
        },
        emergencyContact: {
          name: 'Nguyễn Văn Chồng',
          relationship: 'Chồng',
          phone: '0987654321'
        },
        insuranceInfo: 'Bảo hiểm y tế',
        isProfileComplete: true,
        completedAt: new Date()
      },
      {
        user: patientUsers[1]._id,
        basicInfo: {
          fullName: 'Trần Văn E',
          dateOfBirth: new Date('1985-08-20'),
          gender: 'male',
          idCard: {
            idNumber: '987654321'
          }
        },
        medicalHistory: [
          {
            condition: 'Viêm tủy răng',
            year: 2023,
            notes: 'Đã điều trị tủy răng số 7'
          }
        ],
        allergies: [],
        contactInfo: {
          phone: '0912345679',
          email: 'patient2@example.com',
          address: {
            street: '456 Đường XYZ',
            city: 'TP.HCM',
            state: 'TP.HCM',
            zipCode: '700000',
            country: 'Việt Nam'
          }
        },
        emergencyContact: {
          name: 'Trần Thị Vợ',
          relationship: 'Vợ',
          phone: '0987654322'
        },
        insuranceInfo: 'Bảo hiểm y tế',
        isProfileComplete: true,
        completedAt: new Date()
      },
      {
        user: patientUsers[2]._id,
        basicInfo: {
          fullName: 'Lê Thị F',
          dateOfBirth: new Date('1995-12-10'),
          gender: 'female',
          idCard: {
            idNumber: '456789123'
          }
        },
        medicalHistory: [],
        allergies: [
          {
            allergen: 'Aspirin',
            severity: 'Nặng',
            reaction: 'Sốc phản vệ'
          }
        ],
        contactInfo: {
          phone: '0912345680',
          email: 'patient3@example.com',
          address: {
            street: '789 Đường DEF',
            city: 'Hà Nội',
            state: 'Hà Nội',
            zipCode: '100000',
            country: 'Việt Nam'
          }
        },
        emergencyContact: {
          name: 'Lê Văn Anh',
          relationship: 'Anh trai',
          phone: '0987654323'
        },
        insuranceInfo: 'Bảo hiểm y tế',
        isProfileComplete: true,
        completedAt: new Date()
      },
      {
        user: patientUsers[3]._id,
        basicInfo: {
          fullName: 'Phạm Văn G',
          dateOfBirth: new Date('1988-03-25'),
          gender: 'male',
          idCard: {
            idNumber: '789123456'
          }
        },
        medicalHistory: [
          {
            condition: 'Răng khôn mọc lệch',
            year: 2022,
            notes: 'Đã nhổ răng khôn'
          }
        ],
        allergies: [],
        contactInfo: {
          phone: '0912345681',
          email: 'patient4@example.com',
          address: {
            street: '321 Đường GHI',
            city: 'TP.HCM',
            state: 'TP.HCM',
            zipCode: '700000',
            country: 'Việt Nam'
          }
        },
        emergencyContact: {
          name: 'Phạm Thị Mẹ',
          relationship: 'Mẹ',
          phone: '0987654324'
        },
        insuranceInfo: 'Bảo hiểm y tế',
        isProfileComplete: true,
        completedAt: new Date()
      },
      {
        user: patientUsers[4]._id,
        basicInfo: {
          fullName: 'Hoàng Thị H',
          dateOfBirth: new Date('1992-07-08'),
          gender: 'female',
          idCard: {
            idNumber: '321654987'
          }
        },
        medicalHistory: [
          {
            condition: 'Viêm nha chu',
            year: 2023,
            notes: 'Đang điều trị'
          }
        ],
        allergies: [
          {
            allergen: 'Ibuprofen',
            severity: 'Trung bình',
            reaction: 'Đau bụng'
          }
        ],
        contactInfo: {
          phone: '0912345682',
          email: 'patient5@example.com',
          address: {
            street: '654 Đường JKL',
            city: 'Hà Nội',
            state: 'Hà Nội',
            zipCode: '100000',
            country: 'Việt Nam'
          }
        },
        emergencyContact: {
          name: 'Hoàng Văn Bố',
          relationship: 'Bố',
          phone: '0987654325'
        },
        insuranceInfo: 'Bảo hiểm y tế',
        isProfileComplete: true,
        completedAt: new Date()
      }
    ];

    const createdPatients = await Patient.insertMany(patients);
    console.log('✅ Patient profiles created:', createdPatients.length);
    return createdPatients;
  } catch (error) {
    console.error('Error creating patients:', error);
    return [];
  }
};

// Create services
const createServices = async () => {
  try {
    console.log('🦷 Creating services...');
    
    const services = [
      {
        name: 'Khám tổng quát răng miệng',
        description: 'Khám tổng quát và đánh giá tình trạng răng miệng',
        category: 'Khám bệnh',
        price: 100000,
        process: [
          {
            step: 1,
            title: 'Khám tổng quát',
            description: 'Kiểm tra tổng thể tình trạng răng miệng'
          },
          {
            step: 2,
            title: 'Chụp X-quang',
            description: 'Chụp X-quang để đánh giá chi tiết'
          },
          {
            step: 3,
            title: 'Tư vấn điều trị',
            description: 'Tư vấn kế hoạch điều trị phù hợp'
          }
        ],
        isActive: true
      },
      {
        name: 'Trám răng composite',
        description: 'Trám răng bằng vật liệu composite thẩm mỹ',
        category: 'Điều trị',
        price: 300000,
        process: [
          {
            step: 1,
            title: 'Làm sạch vùng sâu',
            description: 'Loại bỏ phần răng bị sâu'
          },
          {
            step: 2,
            title: 'Trám composite',
            description: 'Trám bằng vật liệu composite'
          },
          {
            step: 3,
            title: 'Hoàn thiện',
            description: 'Mài dũa và hoàn thiện bề mặt'
          }
        ],
        isActive: true
      },
      {
        name: 'Lấy tủy răng',
        description: 'Điều trị tủy răng bị viêm nhiễm',
        category: 'Điều trị',
        price: 800000,
        process: [
          {
            step: 1,
            title: 'Gây tê',
            description: 'Gây tê vùng răng cần điều trị'
          },
          {
            step: 2,
            title: 'Mở tủy',
            description: 'Mở đường vào buồng tủy'
          },
          {
            step: 3,
            title: 'Làm sạch tủy',
            description: 'Loại bỏ tủy bị viêm nhiễm'
          },
          {
            step: 4,
            title: 'Trám bít',
            description: 'Trám bít ống tủy'
          }
        ],
        isActive: true
      },
      {
        name: 'Nhổ răng khôn',
        description: 'Nhổ răng khôn mọc lệch hoặc gây đau',
        category: 'Phẫu thuật',
        price: 1200000,
        process: [
          {
            step: 1,
            title: 'Khám và chụp X-quang',
            description: 'Đánh giá vị trí răng khôn'
          },
          {
            step: 2,
            title: 'Gây tê',
            description: 'Gây tê vùng răng cần nhổ'
          },
          {
            step: 3,
            title: 'Nhổ răng',
            description: 'Thực hiện nhổ răng khôn'
          },
          {
            step: 4,
            title: 'Khâu vết thương',
            description: 'Khâu vết thương sau nhổ răng'
          }
        ],
        isActive: true
      },
      {
        name: 'Cạo vôi răng',
        description: 'Làm sạch vôi răng và mảng bám',
        category: 'Vệ sinh',
        price: 200000,
        process: [
          {
            step: 1,
            title: 'Khám tổng quát',
            description: 'Kiểm tra tình trạng vôi răng'
          },
          {
            step: 2,
            title: 'Cạo vôi',
            description: 'Sử dụng máy siêu âm cạo vôi'
          },
          {
            step: 3,
            title: 'Đánh bóng',
            description: 'Đánh bóng bề mặt răng'
          }
        ],
        isActive: true
      },
      {
        name: 'Tẩy trắng răng',
        description: 'Tẩy trắng răng bằng công nghệ laser',
        category: 'Thẩm mỹ',
        price: 2000000,
        process: [
          {
            step: 1,
            title: 'Khám và tư vấn',
            description: 'Đánh giá tình trạng răng'
          },
          {
            step: 2,
            title: 'Làm sạch răng',
            description: 'Cạo vôi và làm sạch răng'
          },
          {
            step: 3,
            title: 'Tẩy trắng',
            description: 'Sử dụng gel tẩy trắng và laser'
          },
          {
            step: 4,
            title: 'Hoàn thiện',
            description: 'Đánh bóng và hoàn thiện'
          }
        ],
        isActive: true
      }
    ];

    const createdServices = await Service.insertMany(services);
    console.log('✅ Services created:', createdServices.length);
    return createdServices;
  } catch (error) {
    console.error('Error creating services:', error);
    return [];
  }
};

// Create doctor schedules
const createDoctorSchedules = async (doctors, locations) => {
  try {
    console.log('📅 Creating doctor schedules...');
    
    const schedules = [];
    const today = new Date();
    
    // Create schedules for the next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays
      if (date.getDay() === 0) continue;
      
      // Create schedules for each doctor
      doctors.forEach((doctor, index) => {
        const location = locations[index % locations.length];
        
        // Morning shift (8:00 - 12:00)
        schedules.push({
          doctor: doctor._id,
          location: location._id,
          date: new Date(date),
          startTime: '08:00',
          endTime: '12:00',
          isAvailable: true,
          notes: 'Ca sáng',
          createdBy: doctor._id,
          breakTime: {
            startTime: '10:00',
            endTime: '10:15'
          }
        });
        
        // Afternoon shift (13:00 - 17:00)
        schedules.push({
          doctor: doctor._id,
          location: location._id,
          date: new Date(date),
          startTime: '13:00',
          endTime: '17:00',
          isAvailable: true,
          notes: 'Ca chiều',
          createdBy: doctor._id,
          breakTime: {
            startTime: '15:00',
            endTime: '15:15'
          }
        });
      });
    }

    const createdSchedules = await DoctorSchedule.insertMany(schedules);
    console.log('✅ Doctor schedules created:', createdSchedules.length);
    return createdSchedules;
  } catch (error) {
    console.error('Error creating doctor schedules:', error);
    return [];
  }
};

// Create appointments
const createAppointments = async (doctors, patients, schedules) => {
  try {
    console.log('📝 Creating appointments...');
    
    const appointments = [];
    const today = new Date();
    
    // Create appointments for the next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays
      if (date.getDay() === 0) continue;
      
      // Create 2-3 appointments per day
      const appointmentsPerDay = Math.floor(Math.random() * 2) + 2;
      
      for (let j = 0; j < appointmentsPerDay; j++) {
        const doctor = doctors[Math.floor(Math.random() * doctors.length)];
        const patient = patients[Math.floor(Math.random() * patients.length)];
        
        // Find a suitable schedule for this doctor and date
        const doctorSchedule = schedules.find(s => 
          s.doctor.toString() === doctor._id.toString() &&
          s.date.toDateString() === date.toDateString()
        );
        
        if (doctorSchedule) {
          const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
          const startTime = timeSlots[Math.floor(Math.random() * timeSlots.length)];
          
          // Calculate end time (1 hour later)
          const startTimeMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
          const endTimeMinutes = startTimeMinutes + 60;
          const endHour = Math.floor(endTimeMinutes / 60);
          const endMinute = endTimeMinutes % 60;
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
          
          const statuses = ['pending', 'confirmed', 'cancelled'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          appointments.push({
            appointmentId: `APT${String(appointments.length + 1).padStart(6, '0')}`,
            doctor: doctor._id,
            patient: patient._id,
            schedule: doctorSchedule._id,
            appointmentDate: new Date(date),
            startTime: startTime,
            endTime: endTime,
            reasonForVisit: [
              'Đau răng',
              'Khám tổng quát',
              'Trám răng',
              'Cạo vôi răng',
              'Tẩy trắng răng',
              'Nhổ răng khôn'
            ][Math.floor(Math.random() * 6)],
            status: status,
            paymentStatus: status === 'cancelled' ? 'pending' : 'paid',
            totalAmount: Math.floor(Math.random() * 1000000) + 100000
          });
        }
      }
    }

    const createdAppointments = await Appointment.insertMany(appointments);
    console.log('✅ Appointments created:', createdAppointments.length);
    return createdAppointments;
  } catch (error) {
    console.error('Error creating appointments:', error);
    return [];
  }
};

// Create medical records
const createMedicalRecords = async (doctors, patients, appointments) => {
  try {
    console.log('📋 Creating medical records...');
    
    const medicalRecords = [];
    
    // Create medical records for confirmed appointments
    const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmed');
    
    confirmedAppointments.forEach((appointment, index) => {
      const doctor = doctors.find(d => d._id.toString() === appointment.doctor.toString());
      const patient = patients.find(p => p._id.toString() === appointment.patient.toString());
      
      if (doctor && patient) {
        medicalRecords.push({
          recordId: `MR${String(index + 1).padStart(6, '0')}`,
          patient: patient._id,
          doctor: doctor._id,
          appointment: appointment._id,
          visitDate: appointment.appointmentDate,
          chiefComplaint: appointment.reasonForVisit,
          presentIllness: 'Bệnh nhân đến khám với triệu chứng đau răng, khó chịu khi ăn uống.',
          clinicalExamination: {
            generalAppearance: 'Tốt',
            vitalSigns: {
              bloodPressure: '120/80',
              heartRate: 72,
              temperature: 36.5,
              respiratoryRate: 16
            },
            oralExamination: {
              teeth: {
                condition: 'Răng có dấu hiệu sâu',
                missingTeeth: [],
                filledTeeth: ['Răng số 6'],
                decayedTeeth: ['Răng số 7']
              },
              gums: {
                condition: 'Nướu hơi sưng',
                bleeding: true,
                swelling: true
              },
              tongue: {
                condition: 'Bình thường',
                coating: 'Nhẹ'
              },
              mucosa: {
                condition: 'Bình thường',
                lesions: []
              }
            },
            dentalExamination: {
              occlusion: 'Bình thường',
              tmj: 'Không có vấn đề',
              periodontal: 'Viêm nướu nhẹ',
              endodontic: 'Cần điều trị tủy',
              orthodontic: 'Không cần chỉnh nha'
            }
          },
          diagnosis: {
            primary: 'Sâu răng số 7',
            secondary: ['Viêm nướu nhẹ'],
            differential: ['Viêm tủy răng', 'Áp xe răng']
          },
          treatmentPlan: {
            immediate: ['Trám răng sâu', 'Cạo vôi răng'],
            shortTerm: ['Theo dõi tình trạng răng'],
            longTerm: ['Vệ sinh răng miệng định kỳ'],
            followUp: {
              nextVisit: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week later
              interval: '1 tuần',
              instructions: 'Vệ sinh răng miệng kỹ, tránh ăn đồ ngọt'
            }
          },
          treatmentPerformed: [
            {
              procedure: 'Trám răng composite',
              date: appointment.appointmentDate,
              notes: 'Trám răng số 7 bằng composite',
              materials: ['Composite', 'Bonding agent'],
              cost: 300000
            }
          ],
          notes: 'Bệnh nhân hợp tác tốt trong quá trình điều trị.',
          status: 'completed',
          followUpRequired: true,
          followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          followUpNotes: 'Kiểm tra tình trạng răng sau điều trị',
          createdBy: doctor._id,
          lastUpdatedBy: doctor._id
        });
      }
    });

    const createdMedicalRecords = await MedicalRecord.insertMany(medicalRecords);
    console.log('✅ Medical records created:', createdMedicalRecords.length);
    return createdMedicalRecords;
  } catch (error) {
    console.error('Error creating medical records:', error);
    return [];
  }
};

// Main seeding function
const seedData = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting data seeding...');
    
    // Clear existing data
    await clearData();
    
    // Create data in order
    const locations = await createLocations();
    const { adminUser, doctorUsers, patientUsers } = await createUsers();
    const doctors = await createDoctors(doctorUsers, locations);
    const patients = await createPatients(patientUsers);
    const services = await createServices();
    const schedules = await createDoctorSchedules(doctors, locations);
    const appointments = await createAppointments(doctors, patients, schedules);
    const medicalRecords = await createMedicalRecords(doctors, patients, appointments);
    
    console.log('\n🎉 Data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Locations: ${locations.length}`);
    console.log(`- Users: ${1 + doctorUsers.length + patientUsers.length} (1 admin, ${doctorUsers.length} doctors, ${patientUsers.length} patients)`);
    console.log(`- Doctors: ${doctors.length}`);
    console.log(`- Patients: ${patients.length}`);
    console.log(`- Services: ${services.length}`);
    console.log(`- Schedules: ${schedules.length}`);
    console.log(`- Appointments: ${appointments.length}`);
    console.log(`- Medical Records: ${medicalRecords.length}`);
    
    console.log('\n🔑 Test Accounts:');
    console.log('Admin: admin@dentalclinic.com / admin123');
    console.log('Doctor 1: doctor1@dentalclinic.com / doctor123');
    console.log('Doctor 2: doctor2@dentalclinic.com / doctor123');
    console.log('Doctor 3: doctor3@dentalclinic.com / doctor123');
    console.log('Patient 1: patient1@example.com / patient123');
    console.log('Patient 2: patient2@example.com / patient123');
    console.log('Patient 3: patient3@example.com / patient123');
    console.log('Patient 4: patient4@example.com / patient123');
    console.log('Patient 5: patient5@example.com / patient123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

// Run seeding
if (require.main === module) {
  seedData();
}

module.exports = { seedData };
