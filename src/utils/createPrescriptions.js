const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { User, Doctor, Patient, Appointment, Prescription, Medicine } = require('../models');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dental_clinic');
    console.log('MongoDB Connected for creating prescriptions...');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Create medicines first
const createMedicines = async () => {
  try {
    console.log('💊 Creating medicines...');
    
    const medicines = [
      {
        medicineId: 'MED001',
        name: 'Paracetamol 500mg',
        description: 'Thuốc giảm đau, hạ sốt',
        category: 'Giảm đau',
        dosageForm: 'viên',
        price: 2000,
        isActive: true
      },
      {
        medicineId: 'MED002',
        name: 'Amoxicillin 250mg',
        description: 'Kháng sinh điều trị nhiễm khuẩn',
        category: 'Kháng sinh',
        dosageForm: 'viên',
        price: 5000,
        isActive: true
      },
      {
        medicineId: 'MED003',
        name: 'Ibuprofen 200mg',
        description: 'Thuốc chống viêm, giảm đau',
        category: 'Chống viêm',
        dosageForm: 'viên',
        price: 3000,
        isActive: true
      },
      {
        medicineId: 'MED004',
        name: 'Metronidazole 250mg',
        description: 'Kháng sinh điều trị nhiễm khuẩn kỵ khí',
        category: 'Kháng sinh',
        dosageForm: 'viên',
        price: 4000,
        isActive: true
      },
      {
        medicineId: 'MED005',
        name: 'Diclofenac 50mg',
        description: 'Thuốc chống viêm, giảm đau',
        category: 'Chống viêm',
        dosageForm: 'viên',
        price: 2500,
        isActive: true
      },
      {
        medicineId: 'MED006',
        name: 'Ciprofloxacin 500mg',
        description: 'Kháng sinh phổ rộng',
        category: 'Kháng sinh',
        dosageForm: 'viên',
        price: 8000,
        isActive: true
      },
      {
        medicineId: 'MED007',
        name: 'Nimesulide 100mg',
        description: 'Thuốc chống viêm, giảm đau',
        category: 'Chống viêm',
        dosageForm: 'viên',
        price: 3500,
        isActive: true
      },
      {
        medicineId: 'MED008',
        name: 'Clindamycin 300mg',
        description: 'Kháng sinh điều trị nhiễm khuẩn',
        category: 'Kháng sinh',
        dosageForm: 'viên',
        price: 6000,
        isActive: true
      }
    ];
    
    const createdMedicines = await Medicine.insertMany(medicines);
    console.log(`✅ Created ${createdMedicines.length} medicines`);
    return createdMedicines;
  } catch (error) {
    console.error('Error creating medicines:', error);
    return [];
  }
};

// Create prescriptions
const createPrescriptions = async () => {
  try {
    console.log('📋 Creating prescriptions...');
    
    // Get existing data
    const doctors = await Doctor.find().populate('user');
    const patients = await Patient.find().populate('user');
    const appointments = await Appointment.find({ status: 'confirmed' }).populate('doctor patient');
    const medicines = await Medicine.find();
    
    console.log(`Found: ${doctors.length} doctors, ${patients.length} patients, ${appointments.length} appointments, ${medicines.length} medicines`);
    
    if (doctors.length === 0 || patients.length === 0 || appointments.length === 0) {
      console.log('❌ No doctors, patients, or appointments found. Please run seedData.js and createAppointments.js first.');
      return;
    }
    
    const prescriptions = [];
    
    // Create prescriptions for confirmed appointments
    appointments.forEach((appointment, index) => {
      const doctor = doctors.find(d => d._id.toString() === appointment.doctor.toString());
      const patient = patients.find(p => p._id.toString() === appointment.patient.toString());
      
      if (doctor && patient) {
        // Randomly select 2-4 medicines for each prescription
        const numMedicines = Math.floor(Math.random() * 3) + 2;
        const selectedMedicines = medicines.sort(() => 0.5 - Math.random()).slice(0, numMedicines);
        
        const medications = selectedMedicines.map(medicine => ({
          medicine: medicine._id,
          quantity: Math.floor(Math.random() * 20) + 10, // 10-30 tablets
          dosage: [
            '1 viên x 3 lần/ngày',
            '2 viên x 2 lần/ngày',
            '1 viên x 2 lần/ngày',
            '2 viên x 3 lần/ngày',
            '1 viên x 4 lần/ngày'
          ][Math.floor(Math.random() * 5)]
        }));
        
        const instructions = [
          'Uống thuốc sau khi ăn. Nếu có tác dụng phụ, ngừng thuốc và liên hệ bác sĩ.',
          'Uống thuốc đúng liều lượng. Không tự ý tăng hoặc giảm liều.',
          'Uống thuốc với nước lọc. Tránh uống với rượu bia.',
          'Uống thuốc đều đặn. Nếu quên một liều, uống ngay khi nhớ ra.',
          'Uống thuốc theo đúng hướng dẫn. Nếu có thắc mắc, liên hệ bác sĩ.'
        ];
        
        prescriptions.push({
          appointment: appointment._id,
          patient: patient._id,
          doctor: doctor._id,
          services: [], // Empty for now
          medications: medications,
          instructions: instructions[Math.floor(Math.random() * instructions.length)],
          status: 'unfinished'
        });
      }
    });
    
    const createdPrescriptions = await Prescription.insertMany(prescriptions);
    console.log(`✅ Created ${createdPrescriptions.length} prescriptions`);
    
    console.log('\n🎉 Prescriptions created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Medicines: ${medicines.length}`);
    console.log(`- Prescriptions: ${createdPrescriptions.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating prescriptions:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  connectDB().then(async () => {
    await createMedicines();
    await createPrescriptions();
  });
}

module.exports = { createMedicines, createPrescriptions };
