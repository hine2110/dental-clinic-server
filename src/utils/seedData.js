const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Doctor, Patient, Staff, Management, Location, Service, Medicine, Appointment, MedicalRecord, Prescription, DoctorSchedule, StaffSchedule, Equipment, EquipmentIssue, Invoice, Notification, Verification } = require('../models');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dental_clinic');
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    console.log('🌱 Starting data seeding...\n');

    // Clear existing data to avoid conflicts
    console.log('🧹 Clearing existing data...');
    await Location.deleteMany({});
    await Service.deleteMany({});
    await Medicine.deleteMany({});
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await Staff.deleteMany({});
    await Management.deleteMany({});
    await Appointment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await Prescription.deleteMany({});
    await DoctorSchedule.deleteMany({});
    await StaffSchedule.deleteMany({});
    await Equipment.deleteMany({});
    await EquipmentIssue.deleteMany({});
    await Invoice.deleteMany({});
    await Notification.deleteMany({});
    await Verification.deleteMany({});
    console.log('✅ Existing data cleared');

    // 1. CREATE LOCATIONS
    console.log('🏥 Creating locations...');
    const locations = [
      {
        locationId: 'LOC001',
        name: 'Phòng khám Nha khoa ABC',
        address: '123 Đường ABC, Quận 1, TP.HCM',
        phone: '0281234567',
        email: 'info@dentalclinic.com',
        isActive: true
      },
      {
        locationId: 'LOC002', 
        name: 'Chi nhánh Nha khoa ABC - Hà Nội',
        address: '456 Đường XYZ, Quận Ba Đình, Hà Nội',
        phone: '0241234567',
        email: 'hanoi@dentalclinic.com',
        isActive: true
      }
    ];

    for (const locationData of locations) {
      const existingLocation = await Location.findOne({ locationId: locationData.locationId });
      if (!existingLocation) {
        const location = new Location(locationData);
        await location.save();
        console.log(`✅ Created location: ${location.name}`);
      } else {
        console.log(`ℹ️ Location already exists: ${locationData.name}`);
      }
    }

    // 2. CREATE SERVICES
    console.log('\n🦷 Creating services...');
    const services = [
      {
        serviceId: 'SVC001',
        name: 'Khám răng tổng quát',
        description: 'Khám và đánh giá tình trạng răng miệng tổng thể',
        category: 'Khám bệnh',
        price: 100000,
        duration: 30,
        isActive: true
      },
      {
        serviceId: 'SVC002',
        name: 'Cạo vôi răng',
        description: 'Làm sạch vôi răng và mảng bám',
        category: 'Vệ sinh răng miệng',
        price: 150000,
        duration: 45,
        isActive: true
      },
      {
        serviceId: 'SVC003',
        name: 'Trám răng',
        description: 'Trám răng sâu bằng composite',
        category: 'Điều trị',
        price: 200000,
        duration: 60,
        isActive: true
      }
    ];

    for (const serviceData of services) {
      const existingService = await Service.findOne({ serviceId: serviceData.serviceId });
      if (!existingService) {
        const service = new Service(serviceData);
        await service.save();
        console.log(`✅ Created service: ${service.name}`);
      } else {
        console.log(`ℹ️ Service already exists: ${serviceData.name}`);
      }
    }

    // 3. CREATE MEDICINES
    console.log('\n💊 Creating medicines...');
    const medicines = [
      {
        medicineId: 'MED001',
        name: 'Paracetamol 500mg',
        description: 'Thuốc giảm đau, hạ sốt',
        category: 'Giảm đau',
        price: 5000,
        unit: 'viên',
        stock: 1000,
        isActive: true
      },
      {
        medicineId: 'MED002',
        name: 'Amoxicillin 500mg',
        description: 'Kháng sinh điều trị nhiễm khuẩn',
        category: 'Kháng sinh',
        price: 15000,
        unit: 'viên',
        stock: 500,
        isActive: true
      }
    ];

    for (const medicineData of medicines) {
      const existingMedicine = await Medicine.findOne({ medicineId: medicineData.medicineId });
      if (!existingMedicine) {
        const medicine = new Medicine(medicineData);
        await medicine.save();
        console.log(`✅ Created medicine: ${medicine.name}`);
      } else {
        console.log(`ℹ️ Medicine already exists: ${medicineData.name}`);
      }
    }

    // 4. CREATE USERS AND PROFILES
    console.log('\n👥 Creating users and profiles...');

    // Admin User
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const adminUser = new User({
        fullName: 'Nguyễn Văn Admin',
        email: 'admin@dentalclinic.com',
        phone: '0901234567',
        password: await bcrypt.hash('admin123', 12),
        role: 'admin',
        isActive: true
      });
      await adminUser.save();
      console.log('✅ Created Admin: admin@dentalclinic.com / admin123');
    } else {
      console.log('ℹ️ Admin already exists: admin@dentalclinic.com / admin123');
    }

    // Doctor User
    const doctorExists = await User.findOne({ role: 'doctor' });
    if (!doctorExists) {
      const doctorUser = new User({
        fullName: 'Bác sĩ Nguyễn Văn Bác',
        email: 'doctor@dentalclinic.com',
        phone: '0901234568',
        password: await bcrypt.hash('doctor123', 12),
        role: 'doctor',
        isActive: true
      });
      await doctorUser.save();

      const doctorProfile = new Doctor({
        user: doctorUser._id,
        doctorId: 'DOC001',
        specializations: ['Nha khoa Tổng quát', 'Chỉnh nha'],
        consultationFee: 200000,
        biography: 'Bác sĩ có 10 năm kinh nghiệm trong lĩnh vực nha khoa',
        languages: ['Tiếng Việt', 'Tiếng Anh'],
        workSchedule: {
          monday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          tuesday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          wednesday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          thursday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          friday: { startTime: '08:00', endTime: '17:00', isWorking: true },
          saturday: { startTime: '08:00', endTime: '12:00', isWorking: true },
          sunday: { startTime: null, endTime: null, isWorking: false }
        },
        rating: 4.8,
        totalRatings: 150,
        isAcceptingNewPatients: true,
        availability: {
          isOnline: true,
          status: 'available',
          lastSeen: new Date()
        }
      });
      await doctorProfile.save();
      console.log('✅ Created Doctor: doctor@dentalclinic.com / doctor123');
    } else {
      console.log('ℹ️ Doctor already exists: doctor@dentalclinic.com / doctor123');
    }

    // Receptionist Staff
    const receptionistExists = await User.findOne({ email: 'receptionist@dentalclinic.com' });
    if (!receptionistExists) {
      const receptionistUser = new User({
        fullName: 'Lễ tân Trần Thị Lễ',
        email: 'receptionist@dentalclinic.com',
        phone: '0901234569',
        password: await bcrypt.hash('staff123', 12),
        role: 'staff',
        isActive: true
      });
      await receptionistUser.save();

      const staffProfile = new Staff({
        user: receptionistUser._id,
        staffType: 'receptionist',
        profile: {
          workExperience: '5 năm kinh nghiệm lễ tân',
          previousWorkplace: 'Bệnh viện ABC',
          collegeDegree: 'Cao đẳng Quản trị văn phòng',
          universityDegree: 'Đại học Kinh tế'
        },
        permissions: {
          viewReceptionistSchedule: true,
          viewPatientInfo: true,
          editOwnProfile: true,
          createInvoice: true,
          editPatientInfo: true
        }
      });
      await staffProfile.save();
      console.log('✅ Created Receptionist: receptionist@dentalclinic.com / staff123');
    } else {
      console.log('ℹ️ Receptionist already exists: receptionist@dentalclinic.com / staff123');
    }

    // Store Keeper Staff
    const storeKeeperExists = await User.findOne({ email: 'storekeeper@dentalclinic.com' });
    if (!storeKeeperExists) {
      const storeKeeperUser = new User({
        fullName: 'Kho thuốc Lê Văn Kho',
        email: 'storekeeper@dentalclinic.com',
        phone: '0901234570',
        password: await bcrypt.hash('store123', 12),
        role: 'staff',
        isActive: true
      });
      await storeKeeperUser.save();

      const staffProfile = new Staff({
        user: storeKeeperUser._id,
        staffType: 'storeKepper',
        profile: {
          workExperience: '3 năm quản lý kho thuốc',
          previousWorkplace: 'Nhà thuốc XYZ',
          collegeDegree: 'Cao đẳng Dược',
          universityDegree: 'Đại học Dược'
        },
        permissions: {
          viewStoreKepperSchedule: true,
          viewPrescriptions: true,
          viewInventory: true,
          createMedicine: true,
          updateMedicine: true,
          deleteMedicine: true,
          viewEquipment: true,
          createEquipment: true,
          updateEquipment: true
        }
      });
      await staffProfile.save();
      console.log('✅ Created Store Keeper: storekeeper@dentalclinic.com / store123');
    } else {
      console.log('ℹ️ Store Keeper already exists: storekeeper@dentalclinic.com / store123');
    }

    // Management
    const managementExists = await User.findOne({ role: 'management' });
    if (!managementExists) {
      const managementUser = new User({
        fullName: 'Quản lý Phạm Văn Quản',
        email: 'management@dentalclinic.com',
        phone: '0901234571',
        password: await bcrypt.hash('management123', 12),
        role: 'management',
        isActive: true
      });
      await managementUser.save();

      const managementProfile = new Management({
        user: managementUser._id,
        staffType: 'management',
        profile: {
          workExperience: '8 năm quản lý y tế',
          previousWorkplace: 'Bệnh viện DEF',
          collegeDegree: 'Cao đẳng Quản lý y tế',
          universityDegree: 'Thạc sĩ Quản lý y tế'
        },
        permissions: {
          viewReceptionistSchedule: true,
          viewPatientInfo: true,
          editOwnProfile: true,
          createInvoice: true,
          editPatientInfo: true,
          viewStoreKepperSchedule: true,
          viewPrescriptions: true,
          viewInventory: true,
          createMedicine: true,
          updateMedicine: true,
          deleteMedicine: true,
          viewEquipment: true,
          createEquipment: true,
          updateEquipment: true
        }
      });
      await managementProfile.save();
      console.log('✅ Created Management: management@dentalclinic.com / management123');
    } else {
      console.log('ℹ️ Management already exists: management@dentalclinic.com / management123');
    }

    // Patient
    const patientExists = await User.findOne({ role: 'patient' });
    if (!patientExists) {
      const patientUser = new User({
        fullName: 'Bệnh nhân Hoàng Thị Bệnh',
        email: 'patient@dentalclinic.com',
        phone: '0901234572',
        password: await bcrypt.hash('patient123', 12),
        role: 'patient',
        isActive: true
      });
      await patientUser.save();

      const patientProfile = new Patient({
        user: patientUser._id,
        patientId: 'PAT001',
        basicInfo: {
          fullName: 'Bệnh nhân Hoàng Thị Bệnh',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'female',
          idCard: {
            idNumber: '123456789',
            issuedDate: new Date('2010-01-01'),
            issuedPlace: 'Hà Nội'
          }
        },
        contactInfo: {
          phone: '0901234572',
          email: 'patient@dentalclinic.com',
          address: {
            street: '123 Đường ABC',
            ward: 'Phường 1',
            district: 'Quận 1',
            city: 'Hà Nội',
            state: 'Hà Nội',
            zipCode: '100000'
          },
          emergencyContact: {
            name: 'Nguyễn Văn Khẩn cấp',
            phone: '0901234573',
            relationship: 'Chồng'
          }
        },
        medicalHistory: [
          {
            condition: 'Sâu răng',
            year: 2020,
            notes: 'Đã điều trị tại phòng khám ABC'
          }
        ],
        allergies: [
          {
            allergen: 'Penicillin',
            severity: 'Nhẹ',
            reaction: 'Phát ban nhẹ'
          }
        ],
        insuranceInfo: 'Bảo hiểm y tế',
        preferredLanguage: 'Tiếng Việt',
        isActive: true
      });
      await patientProfile.save();
      console.log('✅ Created Patient: patient@dentalclinic.com / patient123');
    } else {
      console.log('ℹ️ Patient already exists: patient@dentalclinic.com / patient123');
    }

    // 5. CREATE DOCTOR SCHEDULES
    console.log('\n📅 Creating doctor schedules...');
    
    // Get doctor profile and location
    const doctorUser = await User.findOne({ email: 'doctor@dentalclinic.com' });
    const doctorProfile = await Doctor.findOne({ user: doctorUser._id });
    const location = await Location.findOne();
    const managementUser = await User.findOne({ email: 'management@dentalclinic.com' });
    const managementProfile = await Management.findOne({ user: managementUser._id });
    
    const doctorSchedule = new DoctorSchedule({
      doctor: doctorProfile._id,
      location: location._id,
      date: new Date(),
      startTime: '08:00',
      endTime: '17:00',
      createdBy: managementProfile._id,
      isAvailable: true,
      notes: 'Lịch làm việc hàng ngày của bác sĩ'
    });
    await doctorSchedule.save();
    console.log('✅ Created doctor schedule');

    // 6. CREATE SAMPLE APPOINTMENTS
    console.log('\n📅 Creating sample appointments...');
    
    // Get patient profile and medicines
    const patientUser = await User.findOne({ email: 'patient@dentalclinic.com' });
    const patientProfile = await Patient.findOne({ user: patientUser._id });
    const medicinesList = await Medicine.find();
    
    // Tạo nhiều bệnh nhân để test đa dạng
    const patients = [];
    const patientUsers = [
      { email: 'patient1@dentalclinic.com', password: 'patient123', fullName: 'Nguyễn Văn An', phone: '0901234567' },
      { email: 'patient2@dentalclinic.com', password: 'patient123', fullName: 'Trần Thị Bình', phone: '0901234568' },
      { email: 'patient3@dentalclinic.com', password: 'patient123', fullName: 'Lê Văn Cường', phone: '0901234569' },
      { email: 'patient4@dentalclinic.com', password: 'patient123', fullName: 'Phạm Thị Dung', phone: '0901234570' },
      { email: 'patient5@dentalclinic.com', password: 'patient123', fullName: 'Hoàng Văn Em', phone: '0901234571' }
    ];

    for (const userData of patientUsers) {
      const user = new User({
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        phone: userData.phone,
        role: 'patient'
      });
      await user.save();

      const patient = new Patient({
        user: user._id,
        basicInfo: {
          fullName: userData.fullName,
          dateOfBirth: new Date(1990 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          gender: Math.random() > 0.5 ? 'male' : 'female',
          idCard: {
            idNumber: `${Math.floor(Math.random() * 900000000) + 100000000}`
          }
        },
        contactInfo: {
          phone: userData.phone,
          email: userData.email,
          address: {
            street: `${Math.floor(Math.random() * 999) + 1} Đường ${['Lê Lợi', 'Nguyễn Huệ', 'Điện Biên Phủ', 'Cách Mạng Tháng 8'][Math.floor(Math.random() * 4)]}`,
            city: 'TP.HCM',
            state: 'TP.HCM',
            zipCode: '700000'
          }
        },
        insuranceInfo: 'Bảo hiểm y tế',
        medicalHistory: [
          {
            condition: 'Sâu răng',
            year: '2023',
            notes: 'Đã điều trị thành công'
          },
          {
            condition: 'Viêm nướu',
            year: '2022',
            notes: 'Đã khỏi hoàn toàn'
          }
        ]
      });
      await patient.save();
      patients.push(patient);
      console.log(`✅ Created patient: ${userData.fullName}`);
    }

    const appointments = [
      // ==================== HÔM NAY - TEST LUỒNG DOCTOR ====================
      // Checked-in - Đã check-in (Test: Bắt đầu khám, Tạm hoãn)
      {
        appointmentId: 'APT001',
        doctor: doctorProfile._id,
        patient: patients[0]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(),
        startTime: '09:00',
        endTime: '09:30',
        status: 'checked-in',
        reasonForVisit: 'Khám răng tổng quát',
        notes: 'Bệnh nhân đã check-in, sẵn sàng khám'
      },
      // On-hold - Tạm hoãn (Test: Tiếp tục khám)
      {
        appointmentId: 'APT002',
        doctor: doctorProfile._id,
        patient: patients[1]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(),
        startTime: '10:00',
        endTime: '10:30',
        status: 'on-hold',
        reasonForVisit: 'Đau răng hàm dưới',
        notes: 'Bệnh nhân tạm rời đi nghe điện thoại',
        onHoldAt: new Date(Date.now() - 15 * 60 * 1000) // 15 phút trước
      },
      // In-progress - Đang khám (Test: Hoàn thành)
      {
        appointmentId: 'APT003',
        doctor: doctorProfile._id,
        patient: patients[2]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(),
        startTime: '11:00',
        endTime: '11:45',
        status: 'in-progress',
        reasonForVisit: 'Điều trị tủy răng',
        notes: 'Đang tiến hành điều trị tủy'
      },
      // Completed - Đã hoàn thành (Test: Xem thông tin)
      {
        appointmentId: 'APT004',
        doctor: doctorProfile._id,
        patient: patients[3]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(),
        startTime: '14:00',
        endTime: '14:30',
        status: 'completed',
        reasonForVisit: 'Cạo vôi răng',
        notes: 'Khám xong, dặn dò vệ sinh răng miệng'
      },
      // No-show - Không đến (Test: Xem thông tin)
      {
        appointmentId: 'APT005',
        doctor: doctorProfile._id,
        patient: patients[4]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(),
        startTime: '15:00',
        endTime: '15:30',
        status: 'no-show',
        reasonForVisit: 'Tái khám',
        notes: 'Bệnh nhân không đến, đã gọi điện'
      },
      // Cancelled - Đã hủy (Test: Xem thông tin)
      {
        appointmentId: 'APT006',
        doctor: doctorProfile._id,
        patient: patients[0]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(),
        startTime: '16:00',
        endTime: '16:30',
        status: 'cancelled',
        reasonForVisit: 'Tư vấn chỉnh nha',
        notes: 'Hủy do trùng lịch cá nhân'
      },

      // ==================== HÔM QUA - LỊCH SỬ ====================
      // Completed - Đã hoàn thành
      {
        appointmentId: 'APT007',
        doctor: doctorProfile._id,
        patient: patients[1]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '09:30',
        status: 'completed',
        reasonForVisit: 'Trám răng sâu',
        notes: 'Điều trị thành công, bệnh nhân hài lòng'
      },
      // Completed - Đã hoàn thành
      {
        appointmentId: 'APT008',
        doctor: doctorProfile._id,
        patient: patients[2]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        startTime: '14:00',
        endTime: '14:30',
        status: 'completed',
        reasonForVisit: 'Khám định kỳ',
        notes: 'Kiểm tra sức khỏe răng miệng'
      },
      // No-show - Không đến
      {
        appointmentId: 'APT009',
        doctor: doctorProfile._id,
        patient: patients[3]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        startTime: '15:00',
        endTime: '15:30',
        status: 'no-show',
        reasonForVisit: 'Tư vấn chỉnh nha',
        notes: 'Bệnh nhân không đến'
      },

      // ==================== NGÀY MAI - LỊCH SẮP TỚI ====================
      // Checked-in - Đã check-in (Test: Có thể test luồng)
      {
        appointmentId: 'APT010',
        doctor: doctorProfile._id,
        patient: patients[4]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startTime: '09:00',
        endTime: '09:30',
        status: 'checked-in',
        reasonForVisit: 'Khám răng trẻ em',
        notes: 'Bệnh nhân nhỏ tuổi, cần chú ý'
      },
      // On-hold - Tạm hoãn (Test: Có thể test luồng)
      {
        appointmentId: 'APT011',
        doctor: doctorProfile._id,
        patient: patients[0]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startTime: '14:00',
        endTime: '14:30',
        status: 'on-hold',
        reasonForVisit: 'Cạo vôi răng',
        notes: 'Bệnh nhân tạm rời đi',
        onHoldAt: new Date(Date.now() - 10 * 60 * 1000) // 10 phút trước
      },
      // Completed - Đã hoàn thành (Test: Xem thông tin)
      {
        appointmentId: 'APT012',
        doctor: doctorProfile._id,
        patient: patients[1]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startTime: '15:00',
        endTime: '15:30',
        status: 'completed',
        reasonForVisit: 'Tái khám',
        notes: 'Kiểm tra kết quả điều trị'
      },

      // ==================== TUẦN SAU - LỊCH XA ====================
      // Checked-in - Đã check-in (Test: Có thể test luồng)
      {
        appointmentId: 'APT013',
        doctor: doctorProfile._id,
        patient: patients[2]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        startTime: '10:00',
        endTime: '10:30',
        status: 'checked-in',
        reasonForVisit: 'Tư vấn chỉnh nha',
        notes: 'Bệnh nhân quan tâm chỉnh nha'
      },
      // Cancelled - Đã hủy (Test: Xem thông tin)
      {
        appointmentId: 'APT014',
        doctor: doctorProfile._id,
        patient: patients[3]._id,
        schedule: doctorSchedule._id,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        startTime: '15:00',
        endTime: '15:30',
        status: 'cancelled',
        reasonForVisit: 'Khám tổng quát',
        notes: 'Hủy do trùng lịch'
      }
    ];

    for (const appointmentData of appointments) {
      const appointment = new Appointment(appointmentData);
      await appointment.save();
      console.log(`✅ Created appointment: ${appointment.appointmentId}`);
    }

    // 7. CREATE SAMPLE MEDICAL RECORDS
    console.log('\n📋 Creating sample medical records...');
    const medicalRecord = new MedicalRecord({
      recordId: 'MR000001',
      patient: patientProfile._id,
      doctor: doctorProfile._id,
      appointment: appointments[0]._id,
      visitDate: new Date(),
      chiefComplaint: 'Đau răng hàm dưới bên trái',
      presentIllness: 'Đau răng kéo dài 3 ngày, đau tăng khi nhai',
      clinicalExamination: {
        generalAppearance: 'Tình trạng chung tốt',
        vitalSigns: {
          bloodPressure: '120/80',
          heartRate: 72,
          temperature: 36.5,
          respiratoryRate: 16
        },
        oralExamination: {
          teeth: {
            condition: 'Răng số 36 có lỗ sâu lớn',
            missingTeeth: [],
            filledTeeth: ['Răng số 16'],
            decayedTeeth: ['Răng số 36']
          },
          gums: {
            condition: 'Nướu hồng hào, không sưng',
            bleeding: false,
            swelling: false
          },
          tongue: {
            condition: 'Lưỡi bình thường',
            coating: 'Mỏng, màu trắng nhạt'
          },
          mucosa: {
            condition: 'Niêm mạc bình thường',
            lesions: []
          }
        },
        dentalExamination: {
          occlusion: 'Khớp cắn bình thường',
          tmj: 'Khớp thái dương hàm bình thường',
          periodontal: 'Nha chu khỏe mạnh',
          endodontic: 'Tủy răng số 36 bị viêm',
          orthodontic: 'Răng mọc thẳng hàng'
        }
      },
      diagnosis: {
        primary: 'Viêm tủy răng cấp tính',
        secondary: ['Sâu răng lớn'],
        differential: ['Viêm nha chu', 'Áp xe răng']
      },
      treatmentPlan: {
        immediate: ['Giảm đau', 'Làm sạch lỗ sâu'],
        shortTerm: ['Điều trị tủy răng', 'Trám bít ống tủy'],
        longTerm: ['Phục hình răng', 'Theo dõi định kỳ'],
        followUp: {
          nextVisit: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          interval: '1 tuần',
          instructions: 'Uống thuốc đúng liều, tránh nhai mạnh'
        }
      },
      treatmentPerformed: [{
        procedure: 'Làm sạch lỗ sâu',
        date: new Date(),
        notes: 'Loại bỏ mô sâu, chuẩn bị cho điều trị tủy',
        materials: ['Mũi khoan nha khoa', 'Thuốc sát khuẩn'],
        cost: 200000
      }],
      status: 'draft',
      followUpRequired: true,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      followUpNotes: 'Kiểm tra tình trạng tủy răng sau điều trị',
      createdBy: doctorProfile._id,
      notes: 'Cần điều trị trong 2-3 lần hẹn'
    });
    await medicalRecord.save();
    console.log('✅ Created medical record');

    // 8. CREATE SAMPLE PRESCRIPTIONS
    console.log('\n💊 Creating sample prescriptions...');
    const prescription = new Prescription({
      patient: patientProfile._id,
      doctor: doctorProfile._id,
      appointment: appointments[0]._id,
      medications: [
        {
          medicine: medicinesList[0]._id, // Paracetamol
          quantity: 20,
          dosage: '500mg x 3 lần/ngày x 5 ngày'
        },
        {
          medicine: medicinesList[1]._id, // Amoxicillin
          quantity: 14,
          dosage: '500mg x 2 lần/ngày x 7 ngày'
        }
      ],
      instructions: 'Uống thuốc đúng liều, tái khám sau 1 tuần',
      status: 'unfinished'
    });
    await prescription.save();
    console.log('✅ Created prescription');

    console.log('\n🎉 Data seeding completed successfully!');
    console.log('\n📋 TEST ACCOUNTS:');
    console.log('================');
    console.log('👑 Admin: admin@dentalclinic.com / admin123');
    console.log('👨‍⚕️ Doctor: doctor@dentalclinic.com / doctor123');
    console.log('🏥 Receptionist: receptionist@dentalclinic.com / staff123');
    console.log('📦 Store Keeper: storekeeper@dentalclinic.com / store123');
    console.log('👔 Management: management@dentalclinic.com / management123');
    console.log('👤 Patient: patient@dentalclinic.com / patient123');
    
    console.log('\n🚀 You can now start the application:');
    console.log('1. Backend: npm run dev');
    console.log('2. Frontend: npm start');
    console.log('3. Login with any account above');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    seedData();
  });
}

module.exports = { seedData };
