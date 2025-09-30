const Staff = require("../models/Staff");
const StaffSchedule = require("../models/StaffSchedule");
const Prescription = require("../models/Prescription");
const Medicine = require("../models/Medicine");
const DispenseMedicine = require("../models/DispenseMedicine");
const Equipment = require("../models/Equipment");
const EquipmentIssue = require("../models/EquipmentIssue");

// ==================== STORE KEEPER FUNCTIONS ====================

// 1. Xem lịch làm việc theo storeKepper._id do management tạo
const viewStoreKepperSchedule = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const { date, startDate, endDate, status, locationId } = req.query;

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

    if (status !== undefined) query.isAvailable = status === "available";

    const schedules = await StaffSchedule.find(query)
      .populate("staff", "staffType user")
      .populate("location", "name address")
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy lịch làm việc của store keeper thành công",
      data: schedules,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch làm việc của store keeper",
      error: error.message,
    });
  }
};

// 2. Xem đơn thuốc do bác sĩ tạo
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

// 3. Lấy thuốc từ kho theo đơn của bác sĩ và trừ tồn kho
// Body: { prescriptionId, patientId, items: [{ medicineId, quantity, unitPrice }], notes }
const dispenseMedicines = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const { prescriptionId, patientId, items = [], notes } = req.body;

    if (!prescriptionId || !patientId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu: prescriptionId, patientId, items",
      });
    }

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn thuốc" });
    }

    const results = [];
    for (const item of items) {
      const { medicineId, quantity, unitPrice } = item;
      if (!medicineId || !quantity || quantity <= 0 || !unitPrice || unitPrice <= 0) {
        throw new Error("Dữ liệu thuốc không hợp lệ");
      }

      // Atomic stock decrement without transaction
      const updatedMed = await Medicine.findOneAndUpdate(
        { _id: medicineId, currentStock: { $gte: quantity } },
        { $inc: { currentStock: -quantity } },
        { new: true }
      );
      if (!updatedMed) {
        throw new Error("Thuốc không đủ tồn kho hoặc không tồn tại");
      }

      // Generate a readable sequential dispenseId if not provided
      const existingCount = await DispenseMedicine.countDocuments();
      const nextDispenseId = `DISP${String(existingCount + 1).padStart(6, "0")}`;

      const dispensed = new DispenseMedicine({
        dispenseId: nextDispenseId,
        prescription: prescriptionId,
        medicine: medicineId,
        staff: staffId,
        patient: patientId,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
        notes,
        status: "dispensed",
      });
      await dispensed.save();
      results.push(dispensed);
    }

    // Update prescription status to a valid enum in Prescription model
    prescription.status = "completed";
    await prescription.save();

    res.status(200).json({
      success: true,
      message: "Xuất thuốc và cập nhật tồn kho thành công",
      data: { dispenses: results, prescription },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xuất thuốc",
      error: error.message,
    });
  }
};

// 4. INVENTORY - Thuốc: xem, tạo, cập nhật, xóa
const viewInventory = async (req, res) => {
  try {
    const { isActive } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === "true";
    const meds = await Medicine.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, message: "Lấy danh sách thuốc thành công", data: meds });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách thuốc", error: error.message });
  }
};

const createMedicine = async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.name || !data.price) {
      return res.status(400).json({ success: false, message: "Thiếu tên thuốc hoặc giá" });
    }
    if (!data.medicineId) {
      const count = await Medicine.countDocuments();
      data.medicineId = `MED${String(count + 1).padStart(4, "0")}`;
    }
    const created = new Medicine(data);
    await created.save();
    res.status(201).json({ success: true, message: "Tạo thuốc thành công", data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi tạo thuốc", error: error.message });
  }
};

const updateMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params;
    const update = req.body || {};
    const updated = await Medicine.findByIdAndUpdate(medicineId, update, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy thuốc" });
    res.status(200).json({ success: true, message: "Cập nhật thuốc thành công", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật thuốc", error: error.message });
  }
};

const deleteMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params;
    const deleted = await Medicine.findByIdAndDelete(medicineId);
    if (!deleted) return res.status(404).json({ success: false, message: "Không tìm thấy thuốc" });
    res.status(200).json({ success: true, message: "Xóa thuốc thành công", data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi xóa thuốc", error: error.message });
  }
};

// 5. EQUIPMENT - xem, tạo, cập nhật, xóa
const viewEquipment = async (req, res) => {
  try {
    const { isActive } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === "true";
    const equipment = await Equipment.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, message: "Lấy danh sách thiết bị thành công", data: equipment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách thiết bị", error: error.message });
  }
};

const createEquipment = async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.name) {
      return res.status(400).json({ success: false, message: "Thiếu tên thiết bị" });
    }
    if (!data.equipmentId) {
      const count = await Equipment.countDocuments();
      data.equipmentId = `EQ${String(count + 1).padStart(4, "0")}`;
    }
    const created = new Equipment(data);
    await created.save();
    res.status(201).json({ success: true, message: "Tạo thiết bị thành công", data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi tạo thiết bị", error: error.message });
  }
};

const updateEquipment = async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const update = req.body || {};
    const updated = await Equipment.findByIdAndUpdate(equipmentId, update, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị" });
    res.status(200).json({ success: true, message: "Cập nhật thiết bị thành công", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật thiết bị", error: error.message });
  }
};

const deleteEquipment = async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const deleted = await Equipment.findByIdAndDelete(equipmentId);
    if (!deleted) return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị" });
    res.status(200).json({ success: true, message: "Xóa thiết bị thành công", data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi xóa thiết bị", error: error.message });
  }
};

// 6. Báo cáo thiết bị bị hỏng
const reportEquipment = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const data = req.body || {};
    if (!data.equipment || !data.issueDescription) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin thiết bị hoặc mô tả lỗi" });
    }
    data.reporter = staffId;
    if (!data.issueId) {
      const count = await EquipmentIssue.countDocuments();
      data.issueId = `ISS${String(count + 1).padStart(5, "0")}`;
    }
    const issue = new EquipmentIssue(data);
    await issue.save();
    res.status(201).json({ success: true, message: "Báo cáo thiết bị thành công", data: issue });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi báo cáo thiết bị", error: error.message });
  }
};

// 7. Chỉnh sửa thông tin cá nhân của Store Keeper
const editOwnProfileStore = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const { profile } = req.body;
    if (!profile || typeof profile !== "object") {
      return res.status(400).json({ success: false, message: "Dữ liệu profile không hợp lệ" });
    }
    const updated = await Staff.findByIdAndUpdate(
      staffId,
      { $set: { profile } },
      { new: true, runValidators: true }
    ).populate("user");

    if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });

    res.status(200).json({ success: true, message: "Cập nhật hồ sơ cá nhân thành công", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật hồ sơ cá nhân", error: error.message });
  }
};

module.exports = {
  viewStoreKepperSchedule,
  viewPrescriptions,
  dispenseMedicines,
  viewInventory,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  viewEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  reportEquipment,
  editOwnProfileStore,
};


