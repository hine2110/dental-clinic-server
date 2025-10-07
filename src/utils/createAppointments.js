const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { User, Doctor, Patient, Appointment, Service, DoctorSchedule, Location, MedicalRecord } = require('../models');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dental_clinic');
    console.log('MongoDB Connected for creating appointments...');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Create appointments and medical records
const createAppointmentsAndRecords = async () => {
  try {
    console.log('📝 Creating appointments and medical records...');
    
    // Get existing data
    const doctors = await Doctor.find().populate('user');
    const patients = await Patient.find().populate('user');
    const services = await Service.find();
    const locations = await Location.find();
    
    console.log(`Found: ${doctors.length} doctors, ${patients.length} patients, ${services.length} services, ${locations.length} locations`);
    
    if (doctors.length === 0 || patients.length === 0) {
      console.log('❌ No doctors or patients found. Please run seedData.js first.');
      return;
    }
    
    // Create doctor schedules for the next 7 days
    const schedules = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays
      if (date.getDay() === 0) continue;
      
      // Create schedules for each doctor
      doctors.forEach((doctor, index) => {
        const location = locations[index % locations.length] || locations[0];
        
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
    console.log(`✅ Created ${createdSchedules.length} doctor schedules`);
    
    // Create appointments
    const appointments = [];
    const reasons = [
      'Đau răng',
      'Khám tổng quát',
      'Trám răng',
      'Cạo vôi răng',
      'Tẩy trắng răng',
      'Nhổ răng khôn',
      'Chỉnh nha',
      'Viêm nướu'
    ];
    
    // Create 2-3 appointments per day for the next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays
      if (date.getDay() === 0) continue;
      
      const appointmentsPerDay = Math.floor(Math.random() * 2) + 2;
      
      for (let j = 0; j < appointmentsPerDay; j++) {
        const doctor = doctors[Math.floor(Math.random() * doctors.length)];
        const patient = patients[Math.floor(Math.random() * patients.length)];
        
        // Find a suitable schedule for this doctor and date
        const doctorSchedule = createdSchedules.find(s => 
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
            reasonForVisit: reasons[Math.floor(Math.random() * reasons.length)],
            status: status,
            paymentStatus: status === 'cancelled' ? 'pending' : 'paid',
            totalAmount: Math.floor(Math.random() * 1000000) + 100000
          });
        }
      }
    }
    
    const createdAppointments = await Appointment.insertMany(appointments);
    console.log(`✅ Created ${createdAppointments.length} appointments`);
    
    // Create medical records for confirmed appointments
    const medicalRecords = [];
    const confirmedAppointments = createdAppointments.filter(apt => apt.status === 'confirmed');
    
    confirmedAppointments.forEach((appointment, index) => {
      const doctor = doctors.find(d => d._id.toString() === appointment.doctor.toString());
      const patient = patients.find(p => p._id.toString() === appointment.patient.toString());
      
      if (doctor && patient) {
        const chiefComplaints = [
          'Đau răng số 7 bên phải',
          'Răng bị sâu cần trám',
          'Nướu chảy máu khi đánh răng',
          'Răng khôn mọc lệch gây đau',
          'Răng bị ố vàng cần tẩy trắng',
          'Răng bị lung lay',
          'Hôi miệng kéo dài',
          'Răng bị mẻ do tai nạn'
        ];
        
        const diagnoses = [
          'Sâu răng số 7',
          'Viêm nướu cấp tính',
          'Răng khôn mọc lệch',
          'Viêm tủy răng',
          'Răng bị mẻ',
          'Viêm nha chu',
          'Răng bị ố vàng',
          'Răng bị lung lay'
        ];
        
        medicalRecords.push({
          recordId: `MR${String(index + 1).padStart(6, '0')}`,
          patient: patient._id,
          doctor: doctor._id,
          appointment: appointment._id,
          visitDate: appointment.appointmentDate,
          chiefComplaint: chiefComplaints[Math.floor(Math.random() * chiefComplaints.length)],
          presentIllness: 'Bệnh nhân đến khám với triệu chứng đau răng, khó chịu khi ăn uống. Triệu chứng xuất hiện từ 2-3 ngày trước.',
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
            primary: diagnoses[Math.floor(Math.random() * diagnoses.length)],
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
          notes: 'Bệnh nhân hợp tác tốt trong quá trình điều trị. Cần theo dõi tình trạng răng sau điều trị.',
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
    console.log(`✅ Created ${createdMedicalRecords.length} medical records`);
    
    console.log('\n🎉 Appointments and medical records created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Doctor Schedules: ${createdSchedules.length}`);
    console.log(`- Appointments: ${createdAppointments.length}`);
    console.log(`- Medical Records: ${createdMedicalRecords.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating appointments and medical records:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    createAppointmentsAndRecords();
  });
}

module.exports = { createAppointmentsAndRecords };
