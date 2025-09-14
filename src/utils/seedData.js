const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Patient, Doctor, Service, Medicine, Equipment } = require('../models');
require('dotenv').config();

const connectDB = require('../config/database');

// Sample users data
const createSampleUsers = async () => {
  const users = [
    // Admin user
    {
      email: 'admin@dentalclinic.com',
      password: 'admin123',
      role: 'admin',
      firstName: 'Quản Trị',
      lastName: 'Viên',
      phone: '0901234567',
      dateOfBirth: new Date('1980-01-01'),
      address: {
        street: '123 Đường ABC',
        city: 'Hồ Chí Minh',
        state: 'Hồ Chí Minh',
        zipCode: '70000',
        country: 'Vietnam'
      }
    },
    // Doctor user  
    {
      email: 'doctor1@dentalclinic.com',
      password: 'doctor123',
      role: 'doctor',
      firstName: 'Nguyễn Văn',
      lastName: 'An',
      phone: '0901234568',
      dateOfBirth: new Date('1985-05-15'),
      address: {
        street: '456 Đường XYZ',
        city: 'Hồ Chí Minh',
        state: 'Hồ Chí Minh',
        zipCode: '70000',
        country: 'Vietnam'
      }
    },
    // Staff user
    {
      email: 'staff1@dentalclinic.com',
      password: 'staff123',
      role: 'receptionist',
      firstName: 'Trần Thị',
      lastName: 'Bình',
      phone: '0901234569',
      dateOfBirth: new Date('1990-08-20'),
      address: {
        street: '789 Đường DEF',
        city: 'Hồ Chí Minh',
        state: 'Hồ Chí Minh',
        zipCode: '70000',
        country: 'Vietnam'
      }
    },
    // Patient user
    {
      email: 'patient1@gmail.com',
      password: 'patient123',
      role: 'patient',
      firstName: 'Lê Minh',
      lastName: 'Cường',
      phone: '0901234570',
      dateOfBirth: new Date('1995-03-10'),
      address: {
        street: '321 Đường GHI',
        city: 'Hồ Chí Minh',
        state: 'Hồ Chí Minh',
        zipCode: '70000',
        country: 'Vietnam'
      }
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    const existingUser = await User.findOne({ email: userData.email });
    if (!existingUser) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.fullName} (${user.role})`);
    } else {
      createdUsers.push(existingUser);
      console.log(`⚠️ User already exists: ${existingUser.email}`);
    }
  }
  
  return createdUsers;
};

// Sample services
const createSampleServices = async (adminUser) => {
  const services = [
    {
      name: 'Khám Tổng Quát',
      description: 'Khám tổng quát răng miệng, tư vấn sức khỏe răng miệng',
      category: 'consultation',
      price: { amount: 200000, currency: 'VND' },
      duration: 30,
      requirements: {
        preparationInstructions: 'Không ăn uống 2 giờ trước khám',
        specialEquipment: ['Gương nha khoa', 'Đèn khám'],
        requiredSpecialization: ['General Dentistry']
      },
      createdBy: adminUser._id
    },
    {
      name: 'Lấy Cao Răng',
      description: 'Làm sạch cao răng, mảng bám trên răng',
      category: 'cleaning',
      price: { amount: 150000, currency: 'VND' },
      duration: 45,
      requirements: {
        preparationInstructions: 'Đánh răng sạch trước khi đến',
        specialEquipment: ['Máy lấy cao răng siêu âm', 'Dụng cụ làm sạch'],
        requiredSpecialization: ['General Dentistry', 'Periodontics']
      },
      createdBy: adminUser._id
    },
    {
      name: 'Trám Răng',
      description: 'Trám răng sâu, phục hồi hình dáng răng',
      category: 'treatment',
      price: { amount: 300000, currency: 'VND' },
      duration: 60,
      requirements: {
        preparationInstructions: 'Thông báo các loại thuốc đang sử dụng',
        specialEquipment: ['Máy khoan nha khoa', 'Vật liệu trám', 'Đèn composite'],
        requiredSpecialization: ['General Dentistry', 'Endodontics']
      },
      createdBy: adminUser._id
    },
    {
      name: 'Nhổ Răng',
      description: 'Nhổ răng khôn, răng sữa, răng hỏng không thể phục hồi',
      category: 'surgery',
      price: { amount: 500000, currency: 'VND' },
      duration: 30,
      requirements: {
        preparationInstructions: 'Ăn no trước khi nhổ răng, không uống rượu bia 24h trước',
        specialEquipment: ['Kìm nhổ răng', 'Đục răng', 'Thuốc tê'],
        requiredSpecialization: ['Oral Surgery', 'General Dentistry']
      },
      createdBy: adminUser._id
    }
  ];

  const createdServices = [];
  for (const serviceData of services) {
    const service = await Service.create(serviceData);
    createdServices.push(service);
    console.log(`✅ Created service: ${service.name} - ${service.formattedPrice}`);
  }
  
  return createdServices;
};

// Sample medicines
const createSampleMedicines = async (adminUser) => {
  const medicines = [
    {
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin',
      manufacturer: 'ABC Pharma',
      category: 'antibiotic',
      dosageForm: 'capsule',
      strength: { value: 500, unit: 'mg' },
      inventory: { currentStock: 100, minimumStock: 20, unit: 'boxes' },
      pricing: { costPrice: 50000, sellingPrice: 80000, currency: 'VND' },
      expiryDate: new Date('2026-12-31'),
      batchNumber: 'AMX2024001',
      storage: {
        conditions: 'Bảo quản nơi khô ráo, thoáng mát',
        temperature: 'Dưới 30°C',
        humidity: 'Độ ẩm < 75%'
      },
      usage: {
        indications: ['Nhiễm trùng răng miệng', 'Viêm nướu', 'Nhiễm trùng sau phẫu thuật nha khoa'],
        contraindications: ['Dị ứng Penicillin', 'Suy gan nặng'],
        sideEffects: ['Buồn nôn', 'Tiêu chảy', 'Phát ban'],
        dosageInstructions: 'Uống 500mg mỗi 8 giờ, sau ăn'
      },
      supplier: {
        name: 'Công ty dược phẩm ABC',
        contact: '028-1234567',
        email: 'sales@abcpharma.vn'
      },
      createdBy: adminUser._id
    },
    {
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      manufacturer: 'XYZ Pharma',
      category: 'painkiller',
      dosageForm: 'tablet',
      strength: { value: 400, unit: 'mg' },
      inventory: { currentStock: 80, minimumStock: 15, unit: 'boxes' },
      pricing: { costPrice: 30000, sellingPrice: 50000, currency: 'VND' },
      expiryDate: new Date('2025-06-30'),
      batchNumber: 'IBU2024001',
      storage: {
        conditions: 'Bảo quản nơi khô ráo, tránh ánh sáng',
        temperature: 'Nhiệt độ phòng',
        humidity: 'Độ ẩm < 60%'
      },
      usage: {
        indications: ['Giảm đau răng', 'Giảm viêm nướu', 'Đau sau khi nhổ răng'],
        contraindications: ['Loét dạ dày', 'Suy thận', 'Thai phụ 3 tháng cuối'],
        sideEffects: ['Đau bụng', 'Chóng mặt', 'Buồn nôn'],
        dosageInstructions: 'Uống 400mg mỗi 6-8 giờ, sau ăn'
      },
      supplier: {
        name: 'Dược phẩm XYZ',
        contact: '028-9876543',
        email: 'contact@xyzpharma.vn'
      },
      createdBy: adminUser._id
    }
  ];

  const createdMedicines = [];
  for (const medicineData of medicines) {
    const medicine = await Medicine.create(medicineData);
    createdMedicines.push(medicine);
    console.log(`✅ Created medicine: ${medicine.name} (Stock: ${medicine.stockStatus})`);
  }
  
  return createdMedicines;
};

// Sample equipment
const createSampleEquipment = async (adminUser) => {
  const equipment = [
    {
      name: 'Ghế Nha Khoa Điện Tử',
      category: 'treatment',
      model: 'DC2000',
      manufacturer: 'DentalCare Inc',
      serialNumber: 'DC2000-001',
      purchaseInfo: {
        purchaseDate: new Date('2023-01-15'),
        cost: 50000000,
        supplier: {
          name: 'Dental Equipment Vietnam',
          contact: '028-1234567',
          email: 'sales@dentalequip.vn'
        },
        warrantyPeriod: 24,
        warrantyExpiry: new Date('2025-01-15')
      },
      location: { room: 'Phòng 1', floor: 'Tầng 2', building: 'Tòa A' },
      maintenanceSchedule: {
        frequency: 'monthly',
        lastMaintenance: new Date('2024-12-01'),
        nextMaintenance: new Date('2025-01-01')
      },
      specifications: {
        dimensions: '2000 x 800 x 1200 mm',
        weight: '120 kg',
        powerRequirements: '220V, 50Hz, 2kW',
        operatingConditions: 'Nhiệt độ 15-35°C, độ ẩm 30-75%',
        capacity: 'Tải trọng tối đa 180kg'
      },
      safety: {
        requiresTraining: true,
        safetyProtocols: ['Kiểm tra điện áp trước sử dụng', 'Vệ sinh sau mỗi bệnh nhân'],
        riskLevel: 'medium'
      },
      documents: {
        manual: 'https://dentalequip.vn/manuals/dc2000.pdf',
        certificate: 'https://dentalequip.vn/certificates/dc2000.pdf',
        warranty: 'https://dentalequip.vn/warranty/dc2000.pdf'
      },
      createdBy: adminUser._id
    },
    {
      name: 'Máy X-Quang Răng',
      category: 'diagnostic',
      model: 'XR-300',
      manufacturer: 'MediTech',
      serialNumber: 'XR300-2023-001',
      purchaseInfo: {
        purchaseDate: new Date('2023-03-20'),
        cost: 80000000,
        supplier: {
          name: 'Medical Technology Vietnam',
          contact: '028-9876543',
          email: 'info@meditech.vn'
        },
        warrantyPeriod: 36,
        warrantyExpiry: new Date('2026-03-20')
      },
      location: { room: 'Phòng X-Quang', floor: 'Tầng 1', building: 'Tòa A' },
      maintenanceSchedule: {
        frequency: 'quarterly',
        lastMaintenance: new Date('2024-10-01'),
        nextMaintenance: new Date('2025-01-01')
      },
      specifications: {
        dimensions: '1500 x 1200 x 1800 mm',
        weight: '85 kg',
        powerRequirements: '220V, 50Hz, 3kW',
        operatingConditions: 'Nhiệt độ 18-30°C, độ ẩm 40-70%',
        capacity: 'Độ phân giải 0.1mm, kV 60-90'
      },
      safety: {
        requiresTraining: true,
        safetyProtocols: ['Đeo tạp dề chì', 'Kiểm tra liều bức xạ định kỳ', 'Không mang thai vào phòng'],
        riskLevel: 'high'
      },
      documents: {
        manual: 'https://meditech.vn/manuals/xr300.pdf',
        certificate: 'https://meditech.vn/certificates/xr300.pdf',
        warranty: 'https://meditech.vn/warranty/xr300.pdf'
      },
      createdBy: adminUser._id
    }
  ];

  const createdEquipment = [];
  for (const equipmentData of equipment) {
    const equipmentItem = await Equipment.create(equipmentData);
    createdEquipment.push(equipmentItem);
    console.log(`✅ Created equipment: ${equipmentItem.name} (${equipmentItem.warrantyStatus})`);
  }
  
  return createdEquipment;
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️ Clearing existing data...');
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await Service.deleteMany({});
    await Medicine.deleteMany({});
    await Equipment.deleteMany({});
    
    console.log('✅ Existing data cleared\n');
    
    console.log('👥 Creating sample users...');
    const users = await createSampleUsers();
    
    const adminUser = users.find(user => user.role === 'admin');
    const doctorUser = users.find(user => user.role === 'doctor');
    const staffUser = users.find(user => user.role === 'receptionist');
    const patientUser = users.find(user => user.role === 'patient');
    
    console.log(`✅ Created ${users.length} users\n`);
    
    // Create doctor profile
    console.log('👨‍⚕️ Creating doctor profiles...');
    if (doctorUser && !await Doctor.findOne({ user: doctorUser._id })) {
      const doctor = await Doctor.create({
        user: doctorUser._id,
        credentials: {
          medicalLicense: 'MD2023001',
          dentalLicense: 'DDS2023001',
          certifications: [
            {
              name: 'Chứng chỉ Implant Nha khoa',
              issuedBy: 'Hội Nha khoa Việt Nam',
              dateIssued: new Date('2020-06-15'),
              expirationDate: new Date('2025-06-15')
            }
          ]
        },
        education: [{
          degree: 'Doctor of Dental Surgery',
          institution: 'Đại Học Y Hà Nội',
          graduationYear: 2008,
          fieldOfStudy: 'Nha Khoa Tổng Quát'
        }],
        specializations: ['General Dentistry', 'Endodontics'],
        experience: { 
          yearsOfPractice: 15,
          previousPositions: [
            {
              position: 'Bác sĩ Nha khoa',
              clinic: 'Phòng khám Nha khoa Sài Gòn',
              startDate: new Date('2008-07-01'),
              endDate: new Date('2015-12-31'),
              description: 'Điều trị nha khoa tổng quát và nội nha'
            }
          ]
        },
        consultationFee: { amount: 200000, currency: 'VND' },
        workSchedule: [
          { dayOfWeek: 'Monday', startTime: '08:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 'Tuesday', startTime: '08:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 'Wednesday', startTime: '08:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 'Thursday', startTime: '08:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 'Friday', startTime: '08:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 'Saturday', startTime: '08:00', endTime: '12:00', isAvailable: true },
          { dayOfWeek: 'Sunday', startTime: '00:00', endTime: '00:00', isAvailable: false }
        ],
        biography: 'Bác sĩ Nguyễn Văn An có hơn 15 năm kinh nghiệm trong lĩnh vực nha khoa. Chuyên về điều trị nội nha và phục hồi răng.',
        languages: ['Vietnamese', 'English']
      });
      console.log('✅ Created doctor profile: Dr. ' + doctorUser.fullName);
    }
    
    // Create patient profile
    console.log('🤒 Creating patient profiles...');
    if (patientUser && !await Patient.findOne({ user: patientUser._id })) {
      const patient = await Patient.create({
        user: patientUser._id,
        emergencyContact: {
          name: 'Lê Thị Hoa',
          relationship: 'Mẹ',
          phone: '0901234571'
        },
        medicalHistory: {
          allergies: ['Penicillin'],
          medications: [
            {
              name: 'Thuốc hạ huyết áp Amlodipine',
              dosage: '5mg',
              frequency: '1 lần/ngày'
            }
          ],
          medicalConditions: ['Huyết áp cao'],
          previousSurgeries: [
            {
              procedure: 'Phẫu thuật ruột thừa',
              date: new Date('2018-03-15'),
              notes: 'Không biến chứng'
            }
          ]
        },
        dentalHistory: {
          previousDentist: 'Bác sĩ Trần Văn B',
          lastCleaningDate: new Date('2024-06-01'),
          lastExamDate: new Date('2024-06-01'),
          orthodonticTreatment: false,
          dentalAnxiety: 'mild'
        },
        insurance: {
          provider: 'Bảo hiểm xã hội',
          policyNumber: 'BHXH123456789',
          groupNumber: 'GRP001',
          subscriberId: 'SUB123456',
          relationToSubscriber: 'self'
        },
        preferences: {
          communicationMethod: 'phone',
          appointmentReminders: true
        }
      });
      console.log('✅ Created patient profile: ' + patientUser.fullName);
    }
    
    console.log('✅ Created profiles\n');
    
    console.log('🏥 Creating dental services...');
    const services = await createSampleServices(adminUser);
    console.log(`✅ Created ${services.length} services\n`);
    
    console.log('💊 Creating medicine inventory...');
    const medicines = await createSampleMedicines(adminUser);
    console.log(`✅ Created ${medicines.length} medicines\n`);
    
    console.log('🔧 Creating medical equipment...');
    const equipmentList = await createSampleEquipment(adminUser);
    console.log(`✅ Created ${equipmentList.length} equipment\n`);
    
    console.log('✅ Database seeding completed successfully!\n');
    
    // Display summary
    const userCount = await User.countDocuments();
    const patientCount = await Patient.countDocuments();
    const doctorCount = await Doctor.countDocuments();
    const serviceCount = await Service.countDocuments();
    const medicineCount = await Medicine.countDocuments();
    const equipmentCount = await Equipment.countDocuments();
    
    console.log('📊 SEEDING SUMMARY:');
    console.log('==========================================');
    console.log(`👥 Users       : ${userCount} accounts`);
    console.log(`🤒 Patients    : ${patientCount} profiles`);
    console.log(`👨‍⚕️ Doctors     : ${doctorCount} profiles`);
    console.log(`🏥 Services    : ${serviceCount} services`);
    console.log(`💊 Medicines   : ${medicineCount} medicines`);
    console.log(`🔧 Equipment   : ${equipmentCount} equipment`);
    console.log('==========================================');
    console.log(`📈 Total Documents: ${userCount + patientCount + doctorCount + serviceCount + medicineCount + equipmentCount}\n`);
    
    console.log('🔐 SAMPLE LOGIN ACCOUNTS:');
    console.log('==========================================');
    console.log('👑 Admin    : admin@dentalclinic.com / admin123');
    console.log('👨‍⚕️ Doctor   : doctor1@dentalclinic.com / doctor123');
    console.log('👩‍💼 Staff    : staff1@dentalclinic.com / staff123');
    console.log('🤒 Patient  : patient1@gmail.com / patient123');
    console.log('==========================================\n');
    
    console.log('🎉 Ready to start development!');
    console.log('🚀 You can now run: npm start');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
