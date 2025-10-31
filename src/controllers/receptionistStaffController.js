const crypto = require('crypto');
const Doctor = require("../models/Doctor");
const DoctorSchedule = require("../models/DoctorSchedule");
const Discount = require("../models/Discount");
const StaffSchedule = require("../models/StaffSchedule");
const Location = require("../models/Location");
const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");
const Staff = require("../models/Staff");
const Service = require("../models/Service");
const Prescription = require("../models/Prescription");
const Medicine = require("../models/Medicine");
const Invoice = require("../models/Invoice");
const User = require("../models/User");
const Patient = require("../models/Patient");
const mongoose = require("mongoose");
const ServiceDoctor = require("../models/ServiceDoctor");

const BANK_ID = "970422"; // Đây là BIN của MBBank. Tra cứu BIN ngân hàng của bạn
const ACCOUNT_NUMBER = "0935655266"; // Thay bằng STK thật của bạn
const ACCOUNT_NAME = "NGUYEN TRAN GIA HUY"; // Tên chủ tài khoản
// ==================== RECEPTIONIST FUNCTIONS ====================

// 5. Xem danh sách lịch hẹn 
const getAppointments = async (req, res) => {
  try {
    const staffId = req.staff._id; 
    const staffSchedules = await StaffSchedule.find({ staff: staffId }).select('location');
    const locationIds = [...new Set(staffSchedules.map(s => s.location.toString()))];
    if (locationIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Bạn chưa được phân công cho bất kỳ cơ sở nào.",
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalAppointments: 0 }
      });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const { status, date, doctorId, search } = req.query;
    let query = {};
    query.location = { $in: locationIds }; 
    if (status) {
      query.status = status;
    } 
    else {
      query.status = { $in: ['confirmed', 'rescheduled'] }; 
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.appointmentDate = { $gte: today };
    }
  
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startDate, $lte: endDate };
    }
    if (doctorId) query.doctor = doctorId;

    if (search) {
      const searchTermRegex = new RegExp(search, 'i');
      const matchingPatients = await Patient.find({ 
        "basicInfo.fullName": searchTermRegex 
      }).select('_id');
      const patientIds = matchingPatients.map(p => p._id);
      query.patient = { $in: patientIds };
    }
    const [appointments, totalAppointments] = await Promise.all([
      Appointment.find(query) 
        .populate({
          path: 'doctor',
          populate: { path: 'user', select: 'fullName' }
        })
        .populate({
          path: 'patient',
          select: 'basicInfo'
        })
        .populate('location', 'name')
        .sort({ appointmentDate: 1, startTime: 1 })
        .skip(skip) 
        .limit(limit), 
      Appointment.countDocuments(query)
    ]);
    
    const totalPages = Math.ceil(totalAppointments / limit);
    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch hẹn thành công",
      data: appointments,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalAppointments: totalAppointments
      }
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


// (HÀM MỚI) 1. Lấy danh sách bệnh nhân "Chờ thanh toán"
const getPaymentQueue = async (req, res) => {
  try {
    // *** LƯU Ý: Thay "completed" bằng "complex" nếu đó là status của bạn ***
    const appointmentsToPay = await Appointment.find({
      status: "completed", // <-- HOẶC "complex"
      paymentStatus: "paid",
    })
    .populate({
      path: "patient",
      select: "basicInfo.fullName contactInfo.phone", 
    })
    .populate({
      path: "doctor",
      select: "user",
      populate: { path: "user", select: "fullName" } 
    })
    .sort({ updatedAt: -1 }); // Ưu tiên các cuộc hẹn vừa xong

    res.status(200).json({
      success: true,
      data: appointmentsToPay,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};

// (HÀM MỚI) 2. Lấy tất cả dịch vụ để nhân viên chọn
const getServicesForBilling = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .select("name price category")
      .lean(); 
    const serviceDoctors = await ServiceDoctor.find({ isActive: true })
      .select("serviceName price")
      .lean(); 
    const standardizedServices = services.map(s => ({
      ...s,
      itemModel: 'Service'
    }));
    const standardizedServiceDoctors = serviceDoctors.map(s => ({
      _id: s._id,
      name: s.serviceName,
      price: s.price,
      category: 'Diagnostic',
      itemModel: 'ServiceDoctor'
    }));
    const allServices = [...standardizedServices, ...standardizedServiceDoctors];

    res.status(200).json({
      success: true,
      data: allServices,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};
const generateInvoiceId = () => {
  // Tạo một mã ngắn, ngẫu nhiên, ví dụ: INV-AB12XY
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${Date.now().toString().slice(-4)}-${randomPart}`;
};

const createDraftInvoice = async (req, res) => {
  const { appointmentId } = req.body;
  const staffId = req.staff._id; 
  try {
    let invoice = await Invoice.findOne({ appointment: appointmentId });
    if (invoice) {
      if (invoice.status === "PENDING") {
        return res.status(200).json({
          success: true,
          message: "Hóa đơn nháp đã tồn tại.",
          data: await invoice.populate('items.item'),
        });
      }
      if (invoice.status === "PAID") {
        return res.status(400).json({ success: false, message: "Hóa đơn này đã được thanh toán." });
      }
    }
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cuộc hẹn." });
    }
    let invoiceItems = [];
    const serviceIds = appointment.selectedServices || [];
    const testServiceIds = appointment.testServices || [];
    if (serviceIds.length > 0) {
      const servicesFromDB = await Service.find({ '_id': { $in: serviceIds }, 'isActive': true });
      const serviceMap = servicesFromDB.reduce((map, service) => {
          map[service._id.toString()] = service;
          return map;
      }, {});
      const serviceCounts = serviceIds.reduce((counts, id) => {
          counts[id.toString()] = (counts[id.toString()] || 0) + 1;
          return counts;
      }, {});
      
      for (const id in serviceCounts) {
          if (serviceMap[id]) {
              const service = serviceMap[id];
              invoiceItems.push({
                  item: service._id,
                  itemModel: 'Service',
                  quantity: serviceCounts[id],
                  priceAtPayment: service.price,
                  nameAtPayment: service.name,
              });
          }
      }
    }
    if (testServiceIds.length > 0) {
      const serviceDoctorsFromDB = await ServiceDoctor.find({ '_id': { $in: testServiceIds }, 'isActive': true });
      const serviceDoctorMap = serviceDoctorsFromDB.reduce((map, service) => {
          map[service._id.toString()] = service;
          return map;
      }, {});
      const testServiceCounts = testServiceIds.reduce((counts, id) => {
          counts[id.toString()] = (counts[id.toString()] || 0) + 1;
          return counts;
      }, {});

      for (const id in testServiceCounts) {
          if (serviceDoctorMap[id]) {
              const service = serviceDoctorMap[id];
              invoiceItems.push({
                  item: service._id,
                  itemModel: 'ServiceDoctor', 
                  quantity: testServiceCounts[id],
                  priceAtPayment: service.price,
                  nameAtPayment: service.serviceName, 
              });
          }
      }
    }

    invoice = new Invoice({
      invoiceId: generateInvoiceId(), 
      appointment: appointmentId,
      patient: appointment.patient,
      staff: staffId,
      status: "PENDING",
      items: invoiceItems, 
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Đã tạo hóa đơn nháp thành công.",
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};


const updateInvoiceItems = async (req, res) => {
  const { invoiceId } = req.params;
  const { items } = req.body; 
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn." });
    }
    if (invoice.status === "PAID") {
      return res.status(400).json({ success: false, message: "Không thể cập nhật hóa đơn đã thanh toán." });
    }
    const updatedItems = [];
    const serviceIds = items
      .filter(i => i.itemModel === 'Service')
      .map(i => i.itemId);
    const serviceDoctorIds = items
      .filter(i => i.itemModel === 'ServiceDoctor')
      .map(i => i.itemId);

    const [services, serviceDoctors] = await Promise.all([
        Service.find({ '_id': { $in: serviceIds } }).lean(),
        ServiceDoctor.find({ '_id': { $in: serviceDoctorIds } }).lean()
    ]);
    
    const serviceMap = services.reduce((map, s) => (map[s._id.toString()] = s, map), {});
    const serviceDoctorMap = serviceDoctors.reduce((map, s) => (map[s._id.toString()] = s, map), {});

    for (const item of items) {
      if (item.itemModel === 'Service' && serviceMap[item.itemId]) {
        const service = serviceMap[item.itemId];
        updatedItems.push({
          item: service._id,
          itemModel: 'Service',
          quantity: item.quantity,
          priceAtPayment: service.price,
          nameAtPayment: service.name,
        });
      } else if (item.itemModel === 'ServiceDoctor' && serviceDoctorMap[item.itemId]) {
        const service = serviceDoctorMap[item.itemId];
        updatedItems.push({
          item: service._id,
          itemModel: 'ServiceDoctor',
          quantity: item.quantity,
          priceAtPayment: service.price,
          nameAtPayment: service.serviceName,
        });
      }
    }

    invoice.items = updatedItems;
    await invoice.save(); 
    res.status(200).json({
      success: true,
      message: "Cập nhật giỏ hàng thành công.",
      data: await invoice.populate('items.item'),
    });
  } catch (error) {
    console.error("Error in updateInvoiceItems:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};


const finalizePayment = async (req, res) => {
  const { invoiceId } = req.params;

  const { 
    paymentMethod, 
    amountGiven, 
    discountCode, 
    originalTotal, 
    finalTotal     
  } = req.body; 

  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn." });
    }
    if (invoice.status === "PAID") {
      return res.status(400).json({ success: false, message: "Hóa đơn này đã được thanh toán." });
    }

    let calculatedDiscountAmount = 0;
    let calculatedFinalTotal = invoice.totalAmount; 
    if (discountCode) {

      const discount = await Discount.findOne({ code: discountCode, isActive: true });
      if (discount) {
        calculatedDiscountAmount = (invoice.totalAmount * discount.discountPercentage) / 100;
        calculatedFinalTotal = invoice.totalAmount - calculatedDiscountAmount;
        if (Math.abs(calculatedFinalTotal - finalTotal) > 1) {
          return res.status(400).json({ 
            success: false, 
            message: `Tính toán giảm giá phía server (ra ${calculatedFinalTotal}) không khớp với client (gửi ${finalTotal}). Vui lòng F5 thử lại.`
          });
        }
        invoice.discountCode = discount.code;
        invoice.discountAmount = calculatedDiscountAmount;
      } else {
         return res.status(400).json({ success: false, message: "Mã giảm giá không hợp lệ (lỗi server)." });
      }
    }

    let change = 0; 

    // 3. DÙNG "calculatedFinalTotal" (đã xác thực) để kiểm tra tiền mặt
    if (paymentMethod === 'cash') {
      const given = parseFloat(amountGiven);
      // === LỖI CŨ CỦA BẠN LÀ Ở ĐÂY ===
      if (isNaN(given) || given < calculatedFinalTotal) { // <-- ĐÃ SỬA
        return res.status(400).json({ 
          success: false, 
          // Trả về số tiền đúng
          message: `Số tiền khách đưa không đủ. Cần ít nhất ${calculatedFinalTotal.toLocaleString('vi-VN')}đ.`
        });
      }
      change = given - calculatedFinalTotal; // Logic tính tiền thối
    }

    // 4. Cập nhật hóa đơn
    invoice.status = "PAID";
    invoice.paymentMethod = paymentMethod;
    invoice.invoiceDate = Date.now();
    // Gán finalAmount (hook pre-save cũng sẽ tính, nhưng gán đè cho chắc)
    invoice.finalAmount = calculatedFinalTotal; 
    await invoice.save();

    // 5. Cập nhật trạng thái của Cuộc hẹn
    await Appointment.findByIdAndUpdate(invoice.appointment, {
      paymentStatus: "service payment", // (Trạng thái bạn định nghĩa)
    });

    res.status(200).json({
      success: true,
      message: "Thanh toán thành công!",
      data: {
        invoice,
        change, // Trả về tiền thối
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};

const applyDiscountCode = async (req, res) => {
  const { code, currentTotal } = req.body;
  // const { invoiceId } = req.params; // Lấy invoiceId nếu bạn cần nó

  if (!code) {
    return res.status(400).json({ success: false, message: "Vui lòng nhập mã giảm giá." });
  }

  try {
    // 1. Tìm mã code, đảm bảo là chữ hoa
    const discount = await Discount.findOne({ code: code.toUpperCase() });

    // 2. Kiểm tra không tồn tại
    if (!discount) {
      return res.status(404).json({ success: false, message: "Mã giảm giá không tồn tại." });
    }

    // 3. Kiểm tra mã có hoạt động không
    if (!discount.isActive) {
      return res.status(400).json({ success: false, message: "Mã giảm giá này đã bị vô hiệu hóa." });
    }

    // 4. Kiểm tra ngày bắt đầu
    if (discount.startDate && discount.startDate > Date.now()) {
      return res.status(400).json({ success: false, message: "Mã giảm giá này chưa đến ngày sử dụng." });
    }

    // 5. Kiểm tra ngày hết hạn
    if (discount.endDate && discount.endDate < Date.now()) {
      return res.status(400).json({ success: false, message: "Mã giảm giá đã hết hạn." });
    }

    // 6. Kiểm tra lượt sử dụng (nếu có giới hạn)
    if (discount.maxUsage !== null && discount.usageCount >= discount.maxUsage) {
      return res.status(400).json({ success: false, message: "Mã giảm giá đã hết lượt sử dụng." });
    }

    // 7. Mọi thứ hợp lệ -> Tính toán số tiền
    const discountAmount = (currentTotal * discount.discountPercentage) / 100;

    // 8. Trả về thông tin cho frontend
    res.status(200).json({
      success: true,
      data: {
        code: discount.code,
        discountAmount: Math.round(discountAmount), // Làm tròn tiền
        percentage: discount.discountPercentage
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};

// (HÀM MỚI) Lấy lịch sử hóa đơn đã thanh toán
const getInvoiceHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { startDate, endDate, paymentMethod, q } = req.query;

    let query = { status: "PAID" };

    if (startDate && endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.invoiceDate = { 
        $gte: new Date(startDate), 
        $lte: endOfDay 
      };
    }
    // Sửa logic: Chỉ thêm filter nếu nó không phải 'all'
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }
    
    if (q) {
      // Logic tìm kiếm bệnh nhân (bạn đã có)
      const patients = await Patient.find({ 'basicInfo.fullName': { $regex: q, $options: 'i' } }).select('_id');
      const patientIds = patients.map(p => p._id);
      
      query.$or = [
        { invoiceId: { $regex: q, $options: 'i' } },
        { patient: { $in: patientIds } }
      ];
    }

    // --- BẮT ĐẦU NÂNG CẤP ---
    // Chạy 3 tác vụ song song sau khi đã có query
    const [
      invoices, 
      totalInvoices,
      revenueResult
    ] = await Promise.all([
      // 1. Lấy danh sách phân trang
      Invoice.find(query)
        .populate({ 
          path: 'patient',
          select: 'basicInfo.fullName'
        })
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(limit),
      // 2. Đếm tổng số văn bản
      Invoice.countDocuments(query),
      // 3. (MỚI) Tính tổng doanh thu
      Invoice.aggregate([
        { $match: query },
        { 
          $group: { 
            _id: null, 
            totalRevenue: { $sum: "$finalAmount" } //
          } 
        }
      ])
    ]);
    
    // Lấy kết quả từ aggregate
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    const totalPages = Math.ceil(totalInvoices / limit);
    // --- KẾT THÚC NÂNG CẤP ---

    res.status(200).json({
      success: true,
      message: "Lấy lịch sử hóa đơn thành công",
      data: invoices,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalInvoices: totalInvoices
      },
      // (MỚI) Trả về đối tượng summary
      summary: {
        totalRevenue: totalRevenue
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch sử hóa đơn",
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

const generateTransferQrCode = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { amount } = req.body;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.status === 'PAID') {
      return res.status(404).json({ success: false, message: "Hóa đơn không hợp lệ hoặc đã thanh toán." });
    }
    if (amount === null || amount === undefined || amount < 0) {
      return res.status(400).json({ success: false, message: "Số tiền không hợp lệ." });
    }
    const memo = `PAY ${invoice._id.toString().slice(-6).toUpperCase()}`;
    const qrCodeUrl = `https://api.vietqr.io/image/${BANK_ID}-${ACCOUNT_NUMBER}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
    res.status(200).json({
      success: true,
      data: {
        qrCodeUrl: qrCodeUrl,
        memo: memo,
        amount: amount 
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi tạo QR: " + error.message });
  }
};

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
    const staffId = req.staff._id; // ID từ Staff model
    const userId = req.user.id;     // ID từ User model (từ middleware 'authenticate')
    
    const { profile, phone } = req.body;
    
    // 1. Cập nhật Staff model (profile chuyên môn)
    if (profile && typeof profile === 'object') {
      await Staff.findByIdAndUpdate(
        staffId,
        { $set: { profile } },
        { runValidators: true }
      );
    }

    // 2. Cập nhật User model (thông tin chung)
    const userDataToUpdate = {};
    if (phone !== undefined) {
      userDataToUpdate.phone = phone;
    }
    if (req.file) { // req.file từ middleware 'upload'
      userDataToUpdate.avatar = `uploads/${req.file.filename}`;
    }

    // Chỉ cập nhật User nếu có gì đó để cập nhật
    if (Object.keys(userDataToUpdate).length > 0) {
      await User.findByIdAndUpdate(
        userId,
        { $set: userDataToUpdate },
        { new: true, runValidators: true }
      );
    }

    // 3. Trả về dữ liệu đã populate
    const updatedStaffProfile = await Staff.findById(staffId).populate("user");

    res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ cá nhân thành công",
      data: updatedStaffProfile
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật hồ sơ cá nhân",
      error: error.message
    });
  }
};


const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params; // Lấy ID của lịch hẹn từ URL
    const { status } = req.body; // Lấy trạng thái mới từ body request

    // Danh sách các trạng thái hợp lệ mà Lễ tân có thể cập nhật
    const allowedStatusUpdates = ['checked-in', 'cancelled', 'no-show']; 
    if (!status || !allowedStatusUpdates.includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái cập nhật không hợp lệ." });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn." });
    }
    
    // Kiểm tra để tránh cập nhật lại các lịch hẹn đã hoàn thành hoặc đã hủy
    if (['completed', 'cancelled'].includes(appointment.status)) {
        return res.status(409).json({ success: false, message: `Lịch hẹn đã ở trạng thái '${appointment.status}' và không thể thay đổi.` });
    }

    appointment.status = status;
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái lịch hẹn thành công!",
      data: appointment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật trạng thái",
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

const getOwnProfile = async (req, res) => {
  try {
    // req.staff._id được cung cấp bởi middleware
    const staffProfile = await Staff.findById(req.staff._id)
      .populate({
        path: "user",
        select: "-password -googleId" // Lấy tất cả thông tin User trừ password
      });

    if (!staffProfile) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ nhân viên." });
    }

    res.status(200).json({ success: true, data: staffProfile });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy hồ sơ cá nhân.",
      error: error.message
    });
  }
};

const getMyLocationsForToday = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);

    const schedules = await StaffSchedule.find({
      staff: staffId,
      date: { $gte: today, $lt: nextDay },
      isAvailable: true
    }).select('location')
      .populate('location', 'name'); 
    const uniqueLocationsMap = new Map();
    schedules.forEach(s => {
      if (s.location) {
        uniqueLocationsMap.set(s.location._id.toString(), s.location);
      }
    });

    const locations = Array.from(uniqueLocationsMap.values());
    
    res.status(200).json({ success: true, data: locations }); 
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createWalkInAppointment = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const {
      locationId,
      appointmentDate,
      time, 
      doctorId,
      existingPatientId,
      patientData
      
    } = req.body;
    const apptFields = { locationId, appointmentDate, time, doctorId };
    for (const [key, value] of Object.entries(apptFields)) {
      if (!value) {
        return res.status(400).json({ success: false, message: `Thiếu thông tin lịch hẹn: ${key}` });
      }
    }

    let patientId;
    if (existingPatientId) {
      const existingPatient = await Patient.findById(existingPatientId);
      if (!existingPatient) {
        return res.status(404).json({ success: false, message: "Lỗi: Bệnh nhân (existingPatientId) không tồn tại." });
      }
      patientId = existingPatient._id;
    } 
    else if (patientData) {
      const { fullName, dateOfBirth, phone, gender, idCard } = patientData;
      const requiredPatientFields = { fullName, dateOfBirth, phone, gender, idCard };
      
      for (const [key, value] of Object.entries(requiredPatientFields)) {
        if (!value) {
          return res.status(400).json({ success: false, message: `Thiếu thông tin bệnh nhân: ${key}` });
        }
      }
      let userEmail = patientData.email;
      if (!userEmail) {
        userEmail = `${new mongoose.Types.ObjectId()}@walkin.placeholder`;
      }
      
      const existingUser = await User.findOne({ email: userEmail });
      if (existingUser && patientData.email) {
          return res.status(409).json({ success: false, message: "Lỗi: Email này đã được sử dụng." });
      }

      const tempPassword = crypto.randomBytes(8).toString('hex');
      const newUser = new User({
        fullName,
        email: userEmail,
        password: tempPassword,
        phone,
        role: 'patient'
      });
      await newUser.save();

      const newPatient = new Patient({
        user: newUser._id,
        basicInfo: {
          fullName: fullName,
          dateOfBirth: new Date(dateOfBirth),
          gender: gender,
          idCard: { idNumber: idCard }
        },
        contactInfo: {
          phone: phone,
          email: userEmail,
          address: { street: "N/A", city: "N/A", state: "N/A", zipCode: "N/A" }
        },
        isProfileComplete: false
      });
      await newPatient.save();
      patientId = newPatient._id;
      
    } else {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bệnh nhân (existingPatientId hoặc patientData)." });
    }
    const targetDate = new Date(appointmentDate);
    const availableDoctors = await getAvailableDoctors(time, targetDate, locationId);
    
    const isDoctorAvailable = availableDoctors.some(
      doc => doc._id.toString() === doctorId
    );
    if (!isDoctorAvailable) {
      return res.status(409).json({ 
        success: false, 
        message: "Khung giờ này của bác sĩ vừa có người khác đặt. Vui lòng F5 và chọn lại." 
      });
    }
    const appointment = new Appointment({
      appointmentId: `APT-${Date.now().toString().slice(-6)}`,
      doctor: doctorId,
      patient: patientId,
      location: locationId,
      staff: staffId, 
      appointmentDate: targetDate,
      startTime: time,
      status: 'checked-in',    
      paymentStatus: 'paid',
      bookingType: 'walk-in'
    });

    await appointment.save();

    res.status(201).json({
      success: true,
      action: 'created', 
      message: "Tạo lịch hẹn vãng lai thành công!",
      data: appointment
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: "Lỗi xác thực: " + error.message });
    }
    console.error("Lỗi khi tạo lịch hẹn vãng lai:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      error: error.message
    });
  }
};

const getAvailableDoctors = async (time, date, locationId) => {
  try {

    const targetDate = new Date(date);
    const targetDateStart = new Date(targetDate.setUTCHours(0, 0, 0, 0));
    const targetDateEnd = new Date(targetDate.setUTCDate(targetDate.getUTCDate() + 1));

      const schedules = await DoctorSchedule.find({
      location: new mongoose.Types.ObjectId(locationId),
      date: { $gte: targetDateStart, $lt: targetDateEnd },
      startTime: { $lte: time },
      endTime: { $gt: time },
      isAvailable: true
    }).populate({
      path: 'doctor',
      populate: { path: 'user', select: 'fullName avatar' },
      select: 'user specializations experience'
    });
    const validSchedules = schedules.filter(s => s.doctor);
    if (validSchedules.length === 0) {
      return [];
    }
    const availableDoctorsOnSchedule = validSchedules.map(s => s.doctor);
    const availableDoctorIds = availableDoctorsOnSchedule.map(d => d._id);
    const existingAppointments = await Appointment.find({
      doctor: { $in: availableDoctorIds },
      appointmentDate: { $gte: targetDateStart, $lt: targetDateEnd },
      startTime: time,
      status: { $in: ["pending", "confirmed"] }
    });
    
    const bookedDoctorIds = new Set(existingAppointments.map(app => app.doctor.toString()));
    const trulyAvailableDoctors = availableDoctorsOnSchedule.filter(
      doctor => !bookedDoctorIds.has(doctor._id.toString())
    );
    const uniqueDoctors = [];
    const doctorIdsSet = new Set();
    for (const doctor of trulyAvailableDoctors) {
      if (!doctorIdsSet.has(doctor._id.toString())) {
        doctorIdsSet.add(doctor._id.toString());
        uniqueDoctors.push(doctor);
      }
    }
    return uniqueDoctors;

  } catch (error) {
    console.error("!!! [DEBUG] Lỗi nghiêm trọng trong getAvailableDoctors:", error);
    return [];
  }
};

// === THAY THẾ HÀM CŨ BẰNG HÀM MỚI NÀY ===
const findPatientByIdCard = async (req, res) => {
  try {
    const { idCard } = req.params;
    if (!idCard) {
      return res.status(400).json({ success: false, message: "Thiếu CCCD." });
    }

    // 1. Tìm TẤT CẢ bệnh nhân khớp CCCD
    // Dùng .populate() để lấy thông tin 'email' từ 'User' liên kết
    const patients = await Patient.find({ 
      "basicInfo.idCard.idNumber": idCard 
    }).populate('user', 'email'); // Lấy email của User liên kết

    // 2. Kiểm tra kết quả
    if (!patients || patients.length === 0) {
      // Không tìm thấy ai
      return res.status(404).json({
        success: false,
        action: 'create_new',
        message: "Không tìm thấy bệnh nhân. Vui lòng tạo hồ sơ mới."
      });
    }

    // 3. ƯU TIÊN chọn tài khoản "Thật"
    let bestMatch;

    if (patients.length === 1) {
      // Nếu chỉ có 1, trả về nó
      bestMatch = patients[0];
    } else {
      // Nếu có nhiều (ví dụ: 1 ma, 1 thật)
      // Tìm tài khoản "thật" (email không phải là email ma)
      bestMatch = patients.find(p => 
        p.user && p.user.email && !p.user.email.endsWith('@walkin.placeholder') //
      );
      
      // Nếu không tìm thấy tài khoản "thật" (ví dụ: cả 2 đều là tài khoản ma),
      // thì trả về cái đầu tiên
      if (!bestMatch) {
        bestMatch = patients[0];
      }
    }

    // 4. Trả về kết quả đã được ưu tiên
    res.status(200).json({
      success: true,
      action: 'patient_found',
      data: bestMatch // Đây sẽ là tài khoản "thật" nếu nó tồn tại
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tìm bệnh nhân",
      error: error.message
    });
  }
};

// === THAY THẾ HÀM CŨ BẰNG HÀM MỚI NÀY ===
const queueWalkInPatient = async (req, res) => {
  const staffId = req.staff._id;
  const { locationId, existingPatientId, patientData } = req.body;
  
  const AVG_SLOT_DURATION_MINUTES = 30; 

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let patientId;
    
    if (existingPatientId) {
      patientId = existingPatientId;
    } 
    else if (patientData) {
      // Nhánh này: Lễ tân tạo mới (vì findPatientByIdCard trả về 'create_new')
      const { fullName, dateOfBirth, phone, gender, idCard, email } = patientData;
      // --- BẮT ĐẦU VÁ LỖI ---
      // Kiểm tra lại lần nữa bên trong transaction
      // để tránh race condition hoặc trường hợp tài khoản "thật" đã được tạo online
      const existingPatientByCCCD = await Patient.findOne({ 
        "basicInfo.idCard.idNumber": idCard 
      }).session(session); 

      if (existingPatientByCCCD) {
        // Bệnh nhân này đã tồn tại (có thể là tài khoản "thật" hoặc "ma").
        // KHÔNG TẠO user ma. Dùng luôn bệnh nhân này.
        patientId = existingPatientByCCCD._id;
        
      } else {
        let userEmail = email;
        if (!email) {
          userEmail = `${new mongoose.Types.ObjectId()}@walkin.placeholder`; 
        }
        
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const newUser = new User({
          fullName, email: userEmail, password: tempPassword, phone, role: 'patient'
        });
        await newUser.save({ session }); 

        const newPatient = new Patient({
          user: newUser._id,
          basicInfo: { fullName, dateOfBirth, gender, idCard: { idNumber: idCard } },
          contactInfo: { phone, email: userEmail, address: { street: "N/A", city: "N/A", state: "N/A", zipCode: "N/A" }},
          isProfileComplete: false
        });
        await newPatient.save({ session }); 
        patientId = newPatient._id;
      }

    } else {
      throw new Error("Thiếu thông tin bệnh nhân.");
    }

    // === 2. THUẬT TOÁN TỰ ĐỘNG GÁN BÁC SĨ ===
    
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    const now = new Date(); 

    // A. Tìm tất cả bác sĩ đang làm việc
    const workingSchedules = await DoctorSchedule.find({
      location: locationId,
      date: { $gte: todayStart, $lt: todayEnd },
      startTime: { $lte: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) },
      endTime: { $gt: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) },
      isAvailable: true
    }).select('doctor').session(session); 

    const workingDoctorIds = workingSchedules.map(s => s.doctor);
    if (workingDoctorIds.length === 0) {
      throw new Error("Không có bác sĩ nào đang trong ca làm việc tại cơ sở này.");
    }

    // B. Lấy hàng chờ của các bác sĩ đó
    const appointments = await Appointment.find({
      doctor: { $in: workingDoctorIds },
      appointmentDate: { $gte: todayStart, $lt: todayEnd },
      status: { $nin: ['cancelled', 'no-show'] } // Chỉ tính các lịch chưa hủy
    }).select('doctor startTime')
      .sort({ startTime: 1 }) 
      .session(session);

    // C. Tính toán "Giờ rảnh tiếp theo" (Logic "Tìm khe hở")
    const doctorQueue = new Map();
    for (const doctorId of workingDoctorIds) {
      const doctorAppts = appointments.filter(a => a.doctor.toString() === doctorId.toString());
      let nextAvailableSlot = new Date(now.getTime()); // Bắt đầu từ bây giờ

      // Lọc ra các lịch hẹn TRONG TƯƠNG LAI (chưa diễn ra)
      const futureAppts = doctorAppts.filter(a => {
        const [hour, min] = a.startTime.split(':').map(Number);
        const apptTime = new Date(todayStart);
        apptTime.setHours(hour, min);
        return apptTime >= now;
      });

      if (futureAppts.length > 0) {
        const [firstHour, firstMin] = futureAppts[0].startTime.split(':').map(Number);
        const firstApptStartTime = new Date(todayStart);
        firstApptStartTime.setHours(firstHour, firstMin);
        
        let nowPlusSlot = new Date(now.getTime() + AVG_SLOT_DURATION_MINUTES * 60000);

        if (nowPlusSlot <= firstApptStartTime) {
          // CÓ KHE HỞ! Bác sĩ rảnh ngay bây giờ.
        } else {
          // KHÔNG CÓ KHE HỞ
          const [lastHour, lastMin] = doctorAppts[doctorAppts.length - 1].startTime.split(':').map(Number);
          const lastApptEndTime = new Date(todayStart);
          lastApptEndTime.setHours(lastHour, lastMin + AVG_SLOT_DURATION_MINUTES);
          nextAvailableSlot = (lastApptEndTime > now) ? lastApptEndTime : now;
        }
      } 
      else if (doctorAppts.length > 0) {
        // Bác sĩ CÓ lịch, nhưng TẤT CẢ đã ở quá khứ
        const [lastHour, lastMin] = doctorAppts[doctorAppts.length - 1].startTime.split(':').map(Number);
        const lastApptEndTime = new Date(todayStart);
        lastApptEndTime.setHours(lastHour, lastMin + AVG_SLOT_DURATION_MINUTES);
        nextAvailableSlot = (lastApptEndTime > now) ? lastApptEndTime : now;
      }
      
      doctorQueue.set(doctorId.toString(), {
        nextSlotTime: nextAvailableSlot,
        totalAppts: doctorAppts.length // Để cân bằng tải
      });
    }

    // D. Tìm bác sĩ rảnh sớm nhất (Cân bằng tải)
    let bestDoctorId = null;
    let earliestTime = new Date("9999-12-31");
    let minAppts = Infinity;

    for (const [doctorId, info] of doctorQueue.entries()) {
      if (info.nextSlotTime < earliestTime) {
        earliestTime = info.nextSlotTime;
        minApppts = info.totalAppts;
        bestDoctorId = doctorId;
      } else if (info.nextSlotTime.getTime() === earliestTime.getTime()) {
        if (info.totalAppts < minApppts) { // Cân bằng tải
          minApppts = info.totalAppts;
          bestDoctorId = doctorId;
        }
      }
    }

    if (!bestDoctorId) {
      throw new Error("Lỗi thuật toán: Không tìm được bác sĩ phù hợp.");
    }
    
    // E. Làm tròn startTime
    const minutes = earliestTime.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15; 
    earliestTime.setMinutes(roundedMinutes, 0, 0);
    const finalStartTime = earliestTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

    // === 3. TẠO LỊCH HẸN ===
    const appointment = new Appointment({
      appointmentId: `APT-${Date.now().toString().slice(-6)}`,
      doctor: bestDoctorId,
      patient: patientId, // Dùng patientId đã được xử lý
      location: locationId,
      staff: staffId, 
      appointmentDate: todayStart, 
      startTime: finalStartTime,   
      status: 'checked-in', //
      paymentStatus: 'paid', //
      bookingType: 'walk-in'
    });
    
    await appointment.save({ session }); 

    // === 4. COMMIT TRANSACTION ===
    await session.commitTransaction();
    session.endSession();

    const assignedDoctor = await Doctor.findById(bestDoctorId).populate('user', 'fullName');
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('location', 'name address')
      .populate('doctor', 'user')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'fullName' }});

    res.status(201).json({
      success: true,
      message: `Xếp hàng thành công! Mời bệnh nhân đến phòng Bác sĩ ${assignedDoctor.user.fullName}.`,
      data: {
        appointment: populatedAppointment,
        doctorName: assignedDoctor.user.fullName,
        assignedTime: finalStartTime
      }
    });

  } catch (error) {
    // 5. ROLLBACK
    await session.abortTransaction();
    session.endSession();
    
    console.error("Lỗi khi xếp hàng vãng lai:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi máy chủ nội bộ."
    });
  }
};

// (HÀM MỚI) 2. API Handler cho Tối ưu 2: Lấy bác sĩ rảnh
const getAvailableDoctorsForApi = async (req, res) => {
  try {
    const { locationId, date, time } = req.query;
    
    if (!locationId || !date || !time) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin locationId, date, hoặc time." });
    }

    // Gọi hàm helper `getAvailableDoctors` mà bạn đã viết
    const doctors = await getAvailableDoctors(time, date, locationId);

    res.status(200).json({
      success: true,
      data: doctors
    });

  } catch (error) {
    console.error("Lỗi API getAvailableDoctorsForApi:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách bác sĩ",
      error: error.message
    });
  }
};



module.exports = {
  viewReceptionistSchedule,
  viewPatientInfo,
  getAppointments,
  getOwnProfile,
  editOwnProfile,
  viewPrescriptions,
  updateAppointmentStatus,
  generateRescheduleLink,
  getPaymentQueue,
  getServicesForBilling,
  createDraftInvoice,
  updateInvoiceItems,
  finalizePayment,
  applyDiscountCode,
  generateTransferQrCode,
  getInvoiceHistory,
  getMyLocationsForToday, // <-- 4. THÊM LẠI VÀO EXPORTS
  createWalkInAppointment,
  findPatientByIdCard,
  getAvailableDoctorsForApi,
  queueWalkInPatient
};