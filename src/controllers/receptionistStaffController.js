const Doctor = require("../models/Doctor");
const DoctorSchedule = require("../models/DoctorSchedule");

const StaffSchedule = require("../models/StaffSchedule");
const Location = require("../models/Location");
const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");
const Staff = require("../models/Staff");
const Service = require("../models/Service");
const DispenseMedicine = require("../models/DispenseMedicine");
const Prescription = require("../models/Prescription");
const Invoice = require("../models/Invoice");
const { 
  validateSchedule, 
  calculateWeeklyWorkingHours, 
  calculateMonthlyWorkingHours,
  getWorkingHoursStats 
} = require("../utils/timeValidation");

// ==================== RECEPTIONIST FUNCTIONS ====================






// 3. Xem lịch làm việc của doctor
const getDoctorSchedules = async (req, res) => {
  try {
    const { doctorId, locationId, date, status, startDate, endDate } = req.query;
    
    let query = {};
    if (doctorId) query.doctor = doctorId;
    if (locationId) query.location = locationId;
    

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };

    } else if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    

    if (status !== undefined) query.isAvailable = status === 'available';

    const schedules = await DoctorSchedule.find(query)
      .populate('doctor', 'doctorId user')

      .populate('location', 'name address')
      .populate('createdBy', 'user')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy lịch làm việc thành công",
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch làm việc",
      error: error.message
    });
  }
};



// 3. Chấp nhận đặt lịch của bệnh nhân
const acceptPatientBooking = async (req, res) => {
  try {
    const { appointmentId } = req.params; // Lấy từ URL params
    const { status = "confirmed" } = req.body; // Status từ body
    const staffId = req.staff._id; // Sử dụng staff ID từ middleware


    console.log("=== ACCEPT PATIENT BOOKING ===");
    console.log("AppointmentId:", appointmentId);
    console.log("Status:", status);
    console.log("StaffId:", staffId);

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'user')
      .populate('doctor', 'doctorId user');
      

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn"
      });
    }

    console.log("Found appointment:", appointment);

    // Bắt buộc đã thu tiền cọc thì mới chấp nhận lịch
    if (appointment.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: "Cần thu tiền cọc trước khi xác nhận lịch hẹn"
      });
    }

    // Cập nhật status và staff xử lý
    appointment.status = status;
    appointment.staff = staffId;
    await appointment.save();


    console.log("Appointment updated successfully");

    // Gửi thông báo cho doctor sau khi lịch được chấp nhận
    await sendDoctorBookingNotification(appointment, staffId);

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái lịch hẹn thành công",
      data: appointment
    });
  } catch (error) {

    console.error("Error in acceptPatientBooking:", error);

    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật lịch hẹn",
      error: error.message
    });
  }
};

// 4. Xem danh sách lịch hẹn chờ duyệt
const getPendingAppointments = async (req, res) => {
  try {
    const { date, doctorId } = req.query;
    
    let query = { status: "pending" }; // Chỉ lấy appointments chờ duyệt
    
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
      .populate('schedule')
      .sort({ appointmentDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch hẹn chờ duyệt thành công",
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

// 5. Xem danh sách lịch hẹn (tất cả)
const getAppointments = async (req, res) => {
  try {
    const { status, date, doctorId } = req.query;
    
    let query = {};
    
    // Mặc định chỉ hiển thị appointments pending nếu không có filter status
    if (status) {
      query.status = status;
    } else {
      // Nếu không có status filter, hiển thị tất cả (pending + confirmed)
      query.status = { $in: ["pending", "confirmed"] };
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
      .populate('staff', 'staffType user')
      .populate('schedule')
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

// ==================== HELPER FUNCTIONS ====================


// 1. Gửi thông báo cho doctor khi có DoctorSchedule mới
const sendDoctorScheduleNotification = async (schedule, staffId) => {
  try {
    const doctorId = schedule.doctor._id || schedule.doctor;
    const locationName = schedule.location?.name || "cơ sở";
    const doctorName = schedule.doctor?.doctorId || "Doctor";

    // Thông báo cho doctor được xếp lịch
    const doctorNotification = new Notification({
      sender: staffId,
      recipients: [doctorId],
      recipientModel: "Doctor",
      title: "Lịch làm việc mới",
      message: `Bạn đã được xếp lịch làm việc tại ${locationName} vào ngày ${schedule.date.toLocaleDateString('vi-VN')} từ ${schedule.startTime} đến ${schedule.endTime}`,
      type: "doctor_schedule_assigned",
      relatedData: {
        scheduleId: schedule._id,
        scheduleType: "doctor",
        location: schedule.location?._id || schedule.location
      }
    });

    // Thông báo cho các staff khác (để thông báo chung)
    const allStaffs = await Staff.find({}).populate('user');
    const allDoctors = await Doctor.find({}).populate('user');
    
    const allRecipients = [
      ...allStaffs.map(s => s.user._id),
      ...allDoctors.map(d => d.user._id)
    ].filter(id => id.toString() !== doctorId.toString());

    const generalNotification = new Notification({
      sender: staffId,
      recipients: allRecipients,
      recipientModel: "User",
      title: "Cập nhật lịch làm việc",
      message: `${doctorName} đã được xếp lịch làm việc tại ${locationName} vào ngày ${schedule.date.toLocaleDateString('vi-VN')}`,
      type: "schedule_update",
      relatedData: {
        scheduleId: schedule._id,
        scheduleType: "doctor",
        assignedPerson: doctorId
      }
    });

    await Promise.all([
      doctorNotification.save(),
      generalNotification.save()
    ]);

  } catch (error) {
    console.error("Lỗi gửi thông báo lịch doctor:", error);
  }
};

// 9. Gửi hóa đơn cho bệnh nhân dựa trên prescription
// Body: { prescriptionId, patientTakesMedicines: boolean }
const sendInvoice = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const { prescriptionId, patientTakesMedicines = true, paymentMethod = "cash" } = req.body;

    if (!prescriptionId) {
      return res.status(400).json({ success: false, message: "Thiếu prescriptionId" });
    }

    // Lấy đơn thuốc cùng bệnh nhân, dịch vụ đã kê
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "user contactInfo")
      .populate("services", "price name");
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn thuốc" });
    }

    // Tính tổng tiền dịch vụ
    const totalServices = Array.isArray(prescription.services)
      ? prescription.services.reduce((sum, s) => sum + (s?.price || 0), 0)
      : 0;

    // Tính tổng tiền thuốc đã xuất theo prescription
    let totalMedicines = 0;
    if (patientTakesMedicines) {
      const dispenses = await DispenseMedicine.find({ prescription: prescription._id, status: { $in: ["dispensed"] } });
      totalMedicines = dispenses.reduce((sum, d) => sum + (d.totalPrice || (d.quantity * d.unitPrice)), 0);
    }

    const totalPrice = patientTakesMedicines ? (totalServices + totalMedicines) : totalServices;

    // Tạo hóa đơn
    const invoiceCount = await Invoice.countDocuments();
    const invoiceId = `INV${String(invoiceCount + 1).padStart(6, '0')}`;
    const invoice = new Invoice({
      invoiceId,
      appointment: prescription.appointment,
      staff: staffId,
      patient: prescription.patient,
      total: totalPrice,
      paymentStatus: "pending",
      paymentMethod
    });
    await invoice.save();

    // Gửi thông báo hóa đơn cho bệnh nhân qua hệ thống Notification
    try {
      // Đảm bảo có patient.user để gửi thông báo tới tài khoản người dùng của bệnh nhân
      if (!prescription.patient?.user) {
        await prescription.populate({ path: 'patient', select: 'user' });
      }
      const patientUserId = prescription.patient?.user || prescription.patient;
      const invoiceNotification = new Notification({
        sender: staffId,
        recipients: [patientUserId],
        recipientModel: "User",
        title: "Hóa đơn dịch vụ",
        message: `Tổng dịch vụ: ${totalServices.toLocaleString('vi-VN')} VND, Tổng thuốc: ${totalMedicines.toLocaleString('vi-VN')} VND, Tổng cộng: ${totalPrice.toLocaleString('vi-VN')} VND`,
        type: "invoice_created",
        relatedData: {
          invoiceId: invoice._id,
          invoiceCode: invoiceId,
          prescriptionId: prescription._id,
          totalServices,
          totalMedicines,
          totalPrice
        }
      });
      await invoiceNotification.save();
    } catch (e) {
      // Không làm fail API nếu gửi thông báo lỗi
    }

    res.status(200).json({
      success: true,
      message: "Gửi hóa đơn thành công",
      data: { invoice, totalServices, totalMedicines, totalPrice }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi gửi hóa đơn", error: error.message });
  }
};

// 2. Gửi thông báo cho staff khi có StaffSchedule mới
const sendStaffScheduleNotification = async (schedule, staffId) => {
  try {
    const assignedStaffId = schedule.staff._id || schedule.staff;
    const locationName = schedule.location?.name || "cơ sở";
    const staffName = schedule.staff?.staffType || "Staff";
    const staffUser = schedule.staff?.user;

    // Thông báo cho staff được xếp lịch
    const staffNotification = new Notification({
      sender: staffId,
      recipients: [assignedStaffId],
      recipientModel: "Staff",
      title: "Lịch làm việc mới",
      message: `Bạn đã được xếp lịch làm việc tại ${locationName} vào ngày ${schedule.date.toLocaleDateString('vi-VN')} từ ${schedule.startTime} đến ${schedule.endTime}`,
      type: "staff_schedule_assigned",
      relatedData: {
        staffScheduleId: schedule._id,
        scheduleType: "staff",
        location: schedule.location?._id || schedule.location
      }
    });

    // Thông báo cho các staff khác (để thông báo chung)
    const allStaffs = await Staff.find({}).populate('user');
    const allDoctors = await Doctor.find({}).populate('user');
    
    const allRecipients = [
      ...allStaffs.map(s => s.user._id),
      ...allDoctors.map(d => d.user._id)
    ].filter(id => id.toString() !== assignedStaffId.toString());

    const generalNotification = new Notification({
      sender: staffId,
      recipients: allRecipients,
      recipientModel: "User",
      title: "Cập nhật lịch làm việc",
      message: `${staffName} đã được xếp lịch làm việc tại ${locationName} vào ngày ${schedule.date.toLocaleDateString('vi-VN')}`,
      type: "schedule_update",
      relatedData: {
        staffScheduleId: schedule._id,
        scheduleType: "staff",
        assignedPerson: assignedStaffId
      }
    });

    await Promise.all([
      staffNotification.save(),
      generalNotification.save()
    ]);

  } catch (error) {
    console.error("Lỗi gửi thông báo lịch staff:", error);
  }
};

// 3. Gửi thông báo cho doctor khi có patient book lịch được accept
const sendDoctorBookingNotification = async (appointment, staffId) => {
  try {
    // Populate appointment nếu chưa có
    if (!appointment.patient || !appointment.doctor) {
      await appointment.populate([
        { path: 'patient', select: 'user' },
        { path: 'doctor', select: 'doctorId user' }
      ]);
    }

    // Thông báo cho doctor được book lịch
    const doctorId = appointment.doctor._id || appointment.doctor;
    const patientName = appointment.patient?.user?.name || appointment.patient?.name || "Bệnh nhân";
    const doctorName = appointment.doctor?.doctorId || "Doctor";

    console.log("DoctorId:", doctorId);
    console.log("PatientName:", patientName);

    const doctorNotification = new Notification({
      sender: staffId,
      recipients: [doctorId],
      recipientModel: "Doctor",
      title: "Lịch hẹn mới",
      message: `${patientName} đã đặt lịch hẹn với bạn vào ngày ${appointment.appointmentDate.toLocaleDateString('vi-VN')} lúc ${appointment.startTime}`,
      type: "appointment_booked",
      relatedData: {
        appointmentId: appointment._id,
        patientId: appointment.patient._id || appointment.patient,
        doctorId: doctorId
      }
    });

    console.log("Doctor notification created:", doctorNotification);

    await doctorNotification.save();

  } catch (error) {
    console.error("Lỗi gửi thông báo đặt lịch:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
  }
};

// 4. Gửi thông báo cho bệnh nhân sau khi thu tiền cọc thành công
const sendPatientBookingNotification = async (appointment, staffId) => {
  try {
    if (!appointment.patient) {
      await appointment.populate({ path: 'patient', select: 'user' });
    }

    const patientNotification = new Notification({
      sender: staffId,
      recipients: [appointment.patient._id || appointment.patient],
      recipientModel: "User",
      title: "Xác nhận đặt lịch",
      message: `Đã nhận tiền cọc. Lịch hẹn của bạn vào ngày ${appointment.appointmentDate.toLocaleDateString('vi-VN')} lúc ${appointment.startTime} đã được xác nhận.`,
      type: "appointment_updated",
      relatedData: {
        appointmentId: appointment._id,
        patientId: appointment.patient._id || appointment.patient
      }
    });

    await patientNotification.save();
  } catch (error) {
    console.error("Lỗi gửi thông báo cho bệnh nhân:", error);
  }
};

// 5. Thu tiền cọc cho lịch hẹn (bắt buộc)
const processDeposit = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const amountRaw = req.body.amount;
    const amount = Number(amountRaw);
    const staffId = req.staff._id;

    const MIN_DEPOSIT = 35000;
    if (!Number.isFinite(amount) || amount < MIN_DEPOSIT) {
      return res.status(400).json({
        success: false,
        message: `Số tiền cọc tối thiểu là ${MIN_DEPOSIT} VND`
      });
    }

    const appointment = await Appointment.findById(appointmentId).populate('patient', 'user');
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn"
      });
    }

    // Cập nhật trạng thái thanh toán
    appointment.paymentStatus = 'paid';
    appointment.totalAmount = Math.max(appointment.totalAmount || 0, amount);
    await appointment.save();

    // Gửi thông báo cho bệnh nhân
    await sendPatientBookingNotification(appointment, staffId);

    res.status(200).json({
      success: true,
      message: "Thu tiền cọc thành công",
      data: appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi thu tiền cọc",
      error: error.message
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

// 5. Quản lý cơ sở (Location)
// const getLocations = async (req, res) => {
//   try {
//     const { isActive } = req.query;
    
//     let query = {};
//     if (isActive !== undefined) query.isActive = isActive === 'true';

//     const locations = await Location.find(query).sort({ name: 1 });

//     res.status(200).json({
//       success: true,
//       message: "Lấy danh sách cơ sở thành công",
//       data: locations
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Lỗi khi lấy danh sách cơ sở",
//       error: error.message
//     });
//   }
// };

// const createLocation = async (req, res) => {
//   try {
//     const locationData = req.body;
//     const staffId = req.staff._id;

//     // Tạo locationId tự động nếu không có
//     if (!locationData.locationId) {
//       const count = await Location.countDocuments();
//       locationData.locationId = `LOC${String(count + 1).padStart(3, '0')}`;
//     }

//     const location = new Location(locationData);
//     await location.save();

//     res.status(201).json({
//       success: true,
//       message: "Tạo cơ sở thành công",
//       data: location
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Lỗi khi tạo cơ sở",
//       error: error.message
//     });
//   }
// };

// const updateLocation = async (req, res) => {
//   try {
//     const { locationId } = req.params;
//     const updateData = req.body;

//     const location = await Location.findByIdAndUpdate(
//       locationId,
//       updateData,
//       { new: true, runValidators: true }
//     );

//     if (!location) {
//       return res.status(404).json({
//         success: false,
//         message: "Không tìm thấy cơ sở"
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Cập nhật cơ sở thành công",
//       data: location
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Lỗi khi cập nhật cơ sở",
//       error: error.message
//     });
//   }
// };



module.exports = {
  getDoctorSchedules,
  viewReceptionistSchedule,
  viewPatientInfo,
  acceptPatientBooking,
  getPendingAppointments,
  getAppointments,
  sendDoctorScheduleNotification,
  sendStaffScheduleNotification,
  sendDoctorBookingNotification,
  sendPatientBookingNotification,
  processDeposit,
  editOwnProfile,
  sendInvoice
};
