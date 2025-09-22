const Prescription = require("../../models/Prescription");
const Medicine = require("../../models/Medicine");
const Service = require("../../models/Service");
const Invoice = require("../../models/Invoice");
const DispenseMedicine = require("../../models/DispenseMedicine");

// ==================== CASHIER FUNCTIONS ====================

// 1. Xem đơn thuốc từ doctor
const getPrescriptions = async (req, res) => {
  try {
    const { status = "active" } = req.query;
    const staffId = req.user.id;

    const prescriptions = await Prescription.find({ 
      status,
      staff: staffId 
    })
    .populate('appointment')
    .populate('patient', 'user')
    .populate('doctor', 'doctorId user')
    .populate('services')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đơn thuốc thành công",
      data: prescriptions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đơn thuốc",
      error: error.message
    });
  }
};

// 2. Bóc thuốc từ kho
const dispenseMedicine = async (req, res) => {
  try {
    const { prescriptionId, medicineData } = req.body;
    const staffId = req.user.id;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn thuốc"
      });
    }

    if (prescription.staff.toString() !== staffId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xử lý đơn thuốc này"
      });
    }

    const dispensedMedicines = [];
    let totalMedicineCost = 0;

    // Xử lý từng loại thuốc
    for (const med of medicineData) {
      const { medicineId, quantity } = med;
      
      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy thuốc với ID: ${medicineId}`
        });
      }

      if (medicine.currentStock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Thuốc ${medicine.name} không đủ số lượng trong kho. Hiện có: ${medicine.currentStock}`
        });
      }

      // Trừ thuốc khỏi kho
      medicine.currentStock -= quantity;
      await medicine.save();

      // Tạo bản ghi bóc thuốc
      const dispenseRecord = new DispenseMedicine({
        prescription: prescriptionId,
        medicine: medicineId,
        staff: staffId,
        patient: prescription.patient,
        quantity,
        unitPrice: medicine.price,
        totalPrice: medicine.price * quantity,
        status: "dispensed"
      });

      await dispenseRecord.save();
      dispensedMedicines.push(dispenseRecord);
      totalMedicineCost += medicine.price * quantity;
    }

    // Cập nhật trạng thái đơn thuốc
    prescription.status = "dispensed";
    await prescription.save();

    res.status(200).json({
      success: true,
      message: "Bóc thuốc thành công",
      data: {
        prescription,
        dispensedMedicines,
        totalMedicineCost
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi bóc thuốc",
      error: error.message
    });
  }
};

// 3. Tạo hóa đơn từ đơn thuốc
const createInvoice = async (req, res) => {
  try {
    const { prescriptionId, paymentMethod = "cash" } = req.body;
    const staffId = req.user.id;

    const prescription = await Prescription.findById(prescriptionId)
      .populate('services')
      .populate('appointment');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn thuốc"
      });
    }

    // Tính tổng tiền services
    let totalServiceCost = 0;
    if (prescription.services && prescription.services.length > 0) {
      totalServiceCost = prescription.services.reduce((sum, service) => sum + service.price, 0);
    }

    // Tính tổng tiền thuốc từ DispenseMedicine
    const dispensedMedicines = await DispenseMedicine.find({ 
      prescription: prescriptionId,
      status: "dispensed"
    });

    let totalMedicineCost = 0;
    if (dispensedMedicines.length > 0) {
      totalMedicineCost = dispensedMedicines.reduce((sum, med) => sum + med.totalPrice, 0);
    }

    const totalAmount = totalServiceCost + totalMedicineCost;

    const invoice = new Invoice({
      appointment: prescription.appointment,
      staff: staffId,
      patient: prescription.patient,
      total: totalAmount,
      paymentStatus: "pending",
      paymentMethod
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Tạo hóa đơn thành công",
      data: {
        invoice,
        totalServiceCost,
        totalMedicineCost,
        totalAmount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo hóa đơn",
      error: error.message
    });
  }
};

// 4. Xử lý thanh toán
const processPayment = async (req, res) => {
  try {
    const { invoiceId, paymentMethod = "cash", paidAmount } = req.body;
    const staffId = req.user.id;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hóa đơn"
      });
    }

    if (invoice.staff.toString() !== staffId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xử lý hóa đơn này"
      });
    }

    let paymentStatus;
    if (paidAmount >= invoice.total) {
      paymentStatus = "paid";
    } else if (paidAmount > 0) {
      paymentStatus = "partial";
    } else {
      return res.status(400).json({
        success: false,
        message: "Số tiền thanh toán phải lớn hơn 0"
      });
    }

    invoice.paymentStatus = paymentStatus;
    invoice.paymentMethod = paymentMethod;
    await invoice.save();

    res.status(200).json({
      success: true,
      message: "Xử lý thanh toán thành công",
      data: {
        invoice,
        paymentStatus,
        remainingAmount: invoice.total - paidAmount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xử lý thanh toán",
      error: error.message
    });
  }
};

// 5. Xem danh sách hóa đơn
const getInvoices = async (req, res) => {
  try {
    const { paymentStatus, startDate, endDate } = req.query;
    const staffId = req.user.id;

    let query = { staff: staffId };
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (startDate && endDate) {
      query.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const invoices = await Invoice.find(query)
      .populate('patient', 'user')
      .populate('appointment')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách hóa đơn thành công",
      data: invoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách hóa đơn",
      error: error.message
    });
  }
};

// 6. Xem chi tiết đơn thuốc
const getPrescriptionDetail = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const staffId = req.user.id;

    const prescription = await Prescription.findById(prescriptionId)
      .populate('appointment')
      .populate('patient', 'user')
      .populate('doctor', 'doctorId user')
      .populate('services');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn thuốc"
      });
    }

    if (prescription.staff.toString() !== staffId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem đơn thuốc này"
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết đơn thuốc thành công",
      data: prescription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết đơn thuốc",
      error: error.message
    });
  }
};

// 7. Xem danh sách thuốc có sẵn
const getAvailableMedicines = async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = { isActive: true, currentStock: { $gt: 0 } };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const medicines = await Medicine.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách thuốc thành công",
      data: medicines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách thuốc",
      error: error.message
    });
  }
};

module.exports = {
  getPrescriptions,
  dispenseMedicine,
  createInvoice,
  processPayment,
  getInvoices,
  getPrescriptionDetail,
  getAvailableMedicines
};
