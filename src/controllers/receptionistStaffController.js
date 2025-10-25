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
const Patient = require("../models/Patient"); // <-- 1. ĐÃ THÊM LẠI IMPORT BỊ THIẾU

const BANK_ID = "970422"; // Đây là BIN của MBBank. Tra cứu BIN ngân hàng của bạn
const ACCOUNT_NUMBER = "0935655266"; // Thay bằng STK thật của bạn
const ACCOUNT_NAME = "NGUYEN TRAN GIA HUY"; // Tên chủ tài khoản
// ==================== RECEPTIONIST FUNCTIONS ====================

// 5. Xem danh sách lịch hẹn 
const getAppointments = async (req, res) => {
  try {
    // === 1. LẤY ID NHÂN VIÊN ===
    // (Giả định middleware 'checkStaffRole' đã thêm req.staff)
    const staffId = req.staff._id; 

    // === 2. TÌM TẤT CẢ CƠ SỞ ĐƯỢC PHÂN CÔNG ===
    // Quét StaffSchedule để xem nhân viên này "thuộc" về những cơ sở nào
    const staffSchedules = await StaffSchedule.find({ staff: staffId }).select('location');
    const locationIds = [...new Set(staffSchedules.map(s => s.location.toString()))];

    // Nếu nhân viên không được phân công ở đâu, trả về rỗng
    if (locationIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Bạn chưa được phân công cho bất kỳ cơ sở nào.",
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalAppointments: 0 }
      });
    }

    // === 3. XÂY DỰNG QUERY (ĐÃ THÊM FILTER CƠ SỞ) ===
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const { status, date, doctorId, search } = req.query;

    let query = {};
    
    // THÊM MỚI: Lọc theo cơ sở được phân công
    query.location = { $in: locationIds }; 

    // (Logic cũ giữ nguyên)
    if (status) {
      query.status = status;
    } 
    else {
      query.status = { $in: ['pending-payment', 'confirmed', 'rescheduled'] };
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
    
    // === 4. THỰC THI QUERY ===
    const [appointments, totalAppointments] = await Promise.all([
      Appointment.find(query) // Query đã được lọc
        .populate({
          path: 'doctor',
          populate: { path: 'user', select: 'fullName' }
        })
        .populate({
          path: 'patient',
          select: 'basicInfo'
        })
        .populate('location', 'name') // (Tùy chọn) Thêm populate location
        .sort({ appointmentDate: 1, startTime: 1 })
        .skip(skip) 
        .limit(limit), 
      Appointment.countDocuments(query) // Đếm query đã lọc
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



// 9. Gửi hóa đơn cho bệnh nhân dựa trên prescription
// Body: { prescriptionId, patientTakesMedicines: boolean }
/**
 * Tạo hóa đơn từ một đơn thuốc.
 * Có thể lựa chọn bao gồm thuốc hoặc không.
 * Nếu bao gồm thuốc, sẽ tự động xuất thuốc và trừ tồn kho.
 */
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
    const services = await Service.find({ isActive: true }).select("name price category");
    res.status(200).json({
      success: true,
      data: services,
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

// (HÀM MỚI - THAY THẾ createInvoice CŨ) 3. Bắt đầu phiên thanh toán (Tạo hóa đơn PENDING)
const createDraftInvoice = async (req, res) => {
  const { appointmentId } = req.body;
  // Sử dụng req.staff._id như trong code cũ của bạn
  const staffId = req.staff._id; 

  try {
    // 1. Kiểm tra xem hóa đơn đã tồn tại cho cuộc hẹn này chưa
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

    // 2. Nếu chưa có, tạo hóa đơn mới
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cuộc hẹn." });
    }

    invoice = new Invoice({
      invoiceId: generateInvoiceId(),
      appointment: appointmentId,
      patient: appointment.patient,
      staff: staffId,
      status: "PENDING",
      items: [], // Giỏ hàng trống
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

// (HÀM MỚI) 4. Cập nhật "Giỏ hàng" (Thêm/Sửa/Xóa dịch vụ)
const updateInvoiceItems = async (req, res) => {
  const { invoiceId } = req.params;
  const { items } = req.body; // items là một mảng: [{ itemId: 'serviceId1', quantity: 2 }, ...]

  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn." });
    }
    if (invoice.status === "PAID") {
      return res.status(400).json({ success: false, message: "Không thể cập nhật hóa đơn đã thanh toán." });
    }

    const updatedItems = [];
    for (const item of items) {
      const service = await Service.findById(item.itemId);
      if (service) {
        updatedItems.push({
          item: service._id,
          quantity: item.quantity,
          priceAtPayment: service.price, // Lấy giá gốc từ DB
          nameAtPayment: service.name,   // Lấy tên gốc từ DB
        });
      }
    }

    invoice.items = updatedItems;
    await invoice.save(); // pre('save') hook sẽ tự động tính lại totalAmount

    res.status(200).json({
      success: true,
      message: "Cập nhật giỏ hàng thành công.",
      data: await invoice.populate('items.item'),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};


// (HÀM MỚI) 5. Hoàn tất thanh toán
// (HÀM MỚI) 5. Hoàn tất thanh toán (ĐÃ CẬP NHẬT HOÀN CHỈNH)
const finalizePayment = async (req, res) => {
  const { invoiceId } = req.params;
  
  // 1. Lấy TẤT CẢ dữ liệu từ frontend
  const { 
    paymentMethod, 
    amountGiven, 
    discountCode, 
    originalTotal, // = totalAmount from items
    finalTotal      // = finalAmount (total - discount)
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
    let calculatedFinalTotal = invoice.totalAmount; // totalAmount là tiền gốc

    // 2. Xác thực lại discount (BẮT BUỘC VÌ BẢO MẬT)
    if (discountCode) {
      // (Bạn phải import Discount model ở đầu file)
      const discount = await Discount.findOne({ code: discountCode, isActive: true });
      if (discount) {
        // (Thêm kiểm tra ngày hết hạn, lượt dùng... nếu cần)
        // if (discount.endDate && discount.endDate < Date.now()) {
        //    return res.status(400).json({ success: false, message: "Mã giảm giá đã hết hạn (lỗi server)." });
        // }

        // Tính toán lại discount dựa trên tiền gốc trong DB
        calculatedDiscountAmount = (invoice.totalAmount * discount.discountPercentage) / 100;
        calculatedFinalTotal = invoice.totalAmount - calculatedDiscountAmount;

        // So sánh với số frontend gửi lên, nếu sai (do làm tròn) thì báo lỗi
        if (Math.abs(calculatedFinalTotal - finalTotal) > 1) { // Chênh lệch 1đ
          return res.status(400).json({ 
            success: false, 
            message: `Tính toán giảm giá phía server (ra ${calculatedFinalTotal}) không khớp với client (gửi ${finalTotal}). Vui lòng F5 thử lại.`
          });
        }
        
        // Gán vào hóa đơn để lưu
        invoice.discountCode = discount.code;
        invoice.discountAmount = calculatedDiscountAmount;

        // (TùY CHỌN: Tăng lượt sử dụng mã)
        // discount.usageCount += 1;
        // await discount.save();

      } else {
         return res.status(400).json({ success: false, message: "Mã giảm giá không hợp lệ (lỗi server)." });
      }
    }

    let change = 0; // Tiền thối

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
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice || invoice.status === 'PAID') {
      return res.status(404).json({ success: false, message: "Hóa đơn không hợp lệ hoặc đã thanh toán." });
    }

    // 1. Lấy số tiền cuối cùng (finalAmount đã trừ discount)
    const amount = invoice.finalAmount; 
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "Hóa đơn không có chi phí." });
    }

    // 2. Tạo nội dung memo duy nhất
    const memo = `PAY ${invoice._id.toString().slice(-6).toUpperCase()}`;

    // 3. Tạo link ảnh QR (Sử dụng dịch vụ VietQR)
    // Link này khi được gọi sẽ trả về một ảnh PNG
    const qrCodeUrl = `https://api.vietqr.io/image/${BANK_ID}-${ACCOUNT_NUMBER}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    // 4. Trả về link ảnh và thông tin cho FE
    res.status(200).json({
      success: true,
      data: {
        qrCodeUrl: qrCodeUrl, // FE sẽ dùng link này cho <img> src
        memo: memo, // FE hiển thị nội dung này cho khách
        amount: amount
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi tạo QR: " + error.message });
  }
};

// 7. Xem thông tin của bệnh nhân
// const Patient = require("../models/Patient"); // <-- 2. ĐÃ XÓA IMPORT THỪA
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

// 3. THÊM LẠI HÀM BỊ MẤT (getMyLocationsForToday)
/**
 * Lấy danh sách cơ sở làm việc HÔM NAY của nhân viên.
 * Dùng cho Socket.io để join room (cho trang Contact).
 */
const getMyLocationsForToday = async (req, res) => {
  try {
    // req.user._id (từ authenticate) -> find Staff
    // Hoặc req.staff._id (từ checkStaffRole)
    const staffId = req.staff._id; // Dùng req.staff._id cho nhất quán

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);

    const schedules = await StaffSchedule.find({
      staff: staffId,
      date: { $gte: today, $lt: nextDay },
      isAvailable: true
    }).select('location')
      .populate('location', 'name'); // Populate tên và ID cơ sở

    // Lọc ra các location duy nhất (phòng trường hợp 1 staff có 2 ca/ngày)
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
  getMyLocationsForToday // <-- 4. THÊM LẠI VÀO EXPORTS
};