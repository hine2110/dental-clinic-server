const Appointment = require('../models/Appointment'); 
const Patient = require('../models/Patient');      
const Doctor = require('../models/Doctor');      
const User = require('../models/User');         
const Service = require('../models/Service');    
const getPatientMedicalHistory = async (req, res) => {
    try {
        const { patientId } = req.params;
        const patientProfile = await Patient.findOne({ user: patientId });
        if (!patientProfile) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ bệnh nhân (patient profile) cho người dùng này.' });
        }
        // 2. Tìm tất cả các cuộc hẹn đã "completed" bằng Patient Profile ID
        const history = await Appointment.find({ 
            patient: patientProfile._id, // <-- Dùng ID của Patient Profile
            status: 'completed'          // Chỉ lấy các lịch đã hoàn thành
        })
        .populate({
            path: 'doctor', // Lấy thông tin bác sĩ từ Appointment
            populate: { 
                path: 'user', // Lồng populate, lấy thông tin User từ Doctor
                select: 'fullName' // Chỉ lấy fullName của User (bác sĩ)
            }
        })
        .populate('selectedServices', 'name price') // Lấy thông tin các dịch vụ đã chọn
        .sort({ appointmentDate: -1 }); // Sắp xếp mới nhất lên đầu

        res.status(200).json({ success: true, data: history });

    } catch (error) {
        console.error("Error fetching medical history:", error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy lịch sử khám bệnh.' });
    }
};
module.exports = { 
    getPatientMedicalHistory
};