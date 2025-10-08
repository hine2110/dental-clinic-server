const Doctor = require("../models/Doctor");
const DoctorSchedule = require("../models/DoctorSchedule");

const StaffSchedule = require("../models/StaffSchedule");
const Location = require("../models/Location");
const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");
const Staff = require("../models/Staff");
const Service = require("../models/Service");
const Prescription = require("../models/Prescription");
const Medicine = require("../models/Medicine");
const Invoice = require("../models/Invoice");

// ==================== RECEPTIONIST FUNCTIONS ====================






// 5. Xem danh sách lịch hẹn 
const getAppointments = async (req, res) => {
  try {
    const { status, date, doctorId } = req.query;
    
    let query = {};
    
    // Mặc định chỉ hiển thị appointments pending nếu không có filter status
    if (status) {
      query.status = status;
    } else {
      // Nếu không có status filter, hiển thị tất cả (pending + confirmed)
      query.status = { $in: [ "confirmed"] };
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }
    if (doctorId) query.doctor = doctorId;

    const appointments = await Appointment.find(query)
      .populate('doctor', 'doctorId user')
      .populate('patient', 'user')
      .sort({ appointmentDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch hẹn thành công",
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách lịch hẹn",
      error: error.message
    });
  }
};

const viewPrescriptions = async (req, res) => {
  try {
    const { status, doctorId, patientId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (doctorId) query.doctor = doctorId;
    if (patientId) query.patient = patientId;

    const prescriptions = await Prescription.find(query)
      .populate("doctor", "doctorId user")
      .populate("patient", "user")
      .populate("appointment")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đơn thuốc thành công",
      data: prescriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đơn thuốc",
      error: error.message,
    });
  }
};

// ==================== HELPER FUNCTIONS ====================



// 9. Gửi hóa đơn cho bệnh nhân dựa trên prescription
// Body: { prescriptionId, patientTakesMedicines: boolean }
/**
 * Tạo hóa đơn từ một đơn thuốc.
 * Có thể lựa chọn bao gồm thuốc hoặc không.
 * Nếu bao gồm thuốc, sẽ tự động xuất thuốc và trừ tồn kho.
 */
const createInvoice = async (req, res) => {
  try {
    const staffId = req.staff._id;
    // Lấy prescriptionId và lựa chọn có bao gồm thuốc hay không từ body
    const { prescriptionId, includeMedicines = false, paymentMethod = "cash" } = req.body;

    if (!prescriptionId) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp ID đơn thuốc (prescriptionId)" });
    }

    // 1. Lấy thông tin đơn thuốc chi tiết
    // Tìm kiếm theo _id (ObjectId)
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "user basicInfo")
      .populate("services", "name price")
      .populate({
        path: 'medications.medicine',
        model: 'Medicine',
        select: 'name price'
      });

    if (!prescription) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn thuốc" });
    }
    
    // Kiểm tra các thông tin cần thiết
    if (!prescription.patient) {
      return res.status(400).json({ success: false, message: "Đơn thuốc không có thông tin bệnh nhân" });
    }
    
    if (!prescription.appointment) {
      return res.status(400).json({ success: false, message: "Đơn thuốc không có thông tin lịch hẹn" });
    }
    
    // An toàn hơn là kiểm tra trạng thái, ví dụ không cho tạo hóa đơn lần 2
    if (prescription.status === 'completed') {
        return res.status(409).json({ success: false, message: `Đơn thuốc này đã được xử lý (trạng thái: ${prescription.status})` });
    }

    // 2. Tính tổng tiền dịch vụ (luôn luôn tính)
    const totalServices = Array.isArray(prescription.services)
      ? prescription.services.reduce((sum, s) => sum + (s?.price || 0), 0)
      : 0;

    let totalMedicines = 0;

    // 3. Xử lý thuốc nếu có yêu cầu
    if (includeMedicines) {
      if (!prescription.medications || prescription.medications.length === 0) {
        return res.status(400).json({ success: false, message: "Đơn thuốc không có thuốc để xuất." });
      }

      // Vòng lặp qua từng loại thuốc trong đơn để trừ tồn kho
      for (const item of prescription.medications) {
        const medicine = item.medicine;
        const quantityToDispense = item.quantity;
        
        if (!medicine || quantityToDispense <= 0) {
            throw new Error("Thông tin thuốc trong đơn không hợp lệ.");
        }
        
        if (!medicine._id) {
            throw new Error(`Thuốc "${medicine.name || 'Unknown'}" không có ID hợp lệ.`);
        }
        
        // Trừ tồn kho một cách an toàn (atomic operation)
        const updatedMed = await Medicine.findOneAndUpdate(
          { _id: medicine._id, currentStock: { $gte: quantityToDispense } },
          { $inc: { currentStock: -quantityToDispense } },
          { new: true }
        );

        if (!updatedMed) {
          throw new Error(`Thuốc "${medicine.name}" không đủ tồn kho hoặc không tồn tại.`);
        }
        
        // Tính tiền thuốc (không lưu lịch sử xuất thuốc)
        const medicineTotalPrice = quantityToDispense * medicine.price;
        totalMedicines += medicineTotalPrice;
      }
    }

    // 4. Tính tổng hóa đơn cuối cùng
    const finalTotalPrice = totalServices + totalMedicines;
    if (finalTotalPrice <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Tổng tiền hóa đơn phải lớn hơn 0" 
      });
    }
    // 5. Tạo hóa đơn
    const invoiceCount = await Invoice.countDocuments();
    const invoiceId = `INV${String(invoiceCount + 1).padStart(6, '0')}`;
    const newInvoice = new Invoice({
      invoiceId,
      appointment: prescription.appointment,
      staff: staffId,
      patient: prescription.patient._id,
      total: finalTotalPrice,
      paymentMethod
    });
    await newInvoice.save();

    // 6. Cập nhật trạng thái đơn thuốc để tránh xử lý lại
    prescription.status = includeMedicines ? 'completed' : 'invoiced'; // 'completed' nếu xuất thuốc, 'invoiced' nếu chỉ HĐ dịch vụ
    await prescription.save();

    // 7. Gửi thông báo (tùy chọn)
    // ... (logic gửi notification có thể giữ nguyên ở đây) ...

    // 8. Trả về kết quả thành công
    res.status(201).json({
      success: true,
      message: "Tạo hóa đơn thành công!",
      data: {
        invoice: newInvoice,
        totalServices,
        totalMedicines,
        finalTotalPrice
      },
    });

  } catch (error) {
    // Nếu có lỗi (ví dụ: hết thuốc), mọi thứ sẽ dừng lại và trả về lỗi
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo hóa đơn",
      error: error.message,
    });
  }
};

// 6. Xem lịch làm việc theo staff._id (receptionist tự xem lịch của mình)
const viewReceptionistSchedule = async (req, res) => {
  try {
    const { date, status, startDate, endDate, locationId } = req.query;
    const staffId = req.staff._id;

    let query = { staff: staffId };
    if (locationId) query.location = locationId;

    if (date) {
      const s = new Date(date);
      const e = new Date(date);
      e.setDate(e.getDate() + 1);
      query.date = { $gte: s, $lt: e };
    } else if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    if (status !== undefined) query.isAvailable = status === 'available';

    const schedules = await StaffSchedule.find(query)
      .populate('staff', 'staffType user')
      .populate('location', 'name address')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy lịch làm việc của receptionist thành công",
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch làm việc của receptionist",
      error: error.message
    });
  }
};

// 7. Xem thông tin của bệnh nhân
const Patient = require("../models/Patient");
const viewPatientInfo = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu patientId"
      });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bệnh nhân"
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy thông tin bệnh nhân thành công",
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin bệnh nhân",
      error: error.message
    });
  }
};

// 8. Chỉnh sửa thông tin cá nhân của receptionist
const editOwnProfile = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const { profile } = req.body;

    if (!profile || typeof profile !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu profile không hợp lệ"
      });
    }

    const updated = await Staff.findByIdAndUpdate(
      staffId,
      { $set: { profile } },
      { new: true, runValidators: true }
    ).populate('user');

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên"
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ cá nhân thành công",
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật hồ sơ cá nhân",
      error: error.message
    });
  }
};

// ham tao link doi lich hen
const generateRescheduleLink = async (req, res) => {
  try {
    const { id: appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    if (appointment.status !== 'confirmed') {
        return res.status(400).json({ success: false, message: 'Chỉ có thể đổi lịch cho các cuộc hẹn đã được xác nhận.' });
    }

    // Tạo một token ngẫu nhiên, an toàn
    const token = crypto.randomBytes(32).toString('hex');
    
    // Đặt thời gian hết hạn cho token (1 giờ kể từ bây giờ)
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    // Lưu token và thời gian hết hạn vào lịch hẹn
    appointment.reschedule_token = token;
    appointment.reschedule_token_expires_at = expiresAt;
    await appointment.save();

    // Trả về token để frontend tạo link hoàn chỉnh
    res.status(200).json({ 
        success: true,
        message: 'Tạo link đổi lịch thành công. Vui lòng gửi link cho bệnh nhân.',
        token: token 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi tạo link đổi lịch", error: error.message });
  }
};




module.exports = {
  viewReceptionistSchedule,
  viewPatientInfo,
  getAppointments,
  editOwnProfile,
  createInvoice,
  viewPrescriptions,
  generateRescheduleLink
};
