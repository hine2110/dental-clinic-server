const Staff = require("../models/Staff");
const StaffSchedule = require("../models/StaffSchedule");
const Prescription = require("../models/Prescription");
const Medicine = require("../models/Medicine");
const Equipment = require("../models/Equipment");
const EquipmentIssue = require("../models/EquipmentIssue");
const User = require("../models/User");
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

const getOwnProfile = async (req, res) => {
  try {
    const staffProfile = await Staff.findById(req.staff._id)
      .populate({
        path: "user",
        select: "-password -googleId"
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

// 3. Lấy thuốc từ kho theo đơn (đã chuyển sang receptionistStaffController)

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
    
    // Nếu có currentStock trong body, cộng dồn vào currentStock hiện tại
    if (update.currentStock !== undefined) {
      const currentMedicine = await Medicine.findById(medicineId);
      if (!currentMedicine) {
        return res.status(404).json({ success: false, message: "Không tìm thấy thuốc" });
      }
      
      // Cộng dồn: newCurrentStock = currentStock (trong kho) + currentStock (vừa nhập)
      // Đảm bảo cả hai đều là number để cộng số học
      const currentStockInDB = Number(currentMedicine.currentStock) || 0;
      const currentStockToAdd = Number(update.currentStock) || 0;
      update.currentStock = currentStockInDB + currentStockToAdd;
    }
    
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
    // MongoDB sẽ tự động tạo _id
    const created = new Equipment(data);
    await created.save();
    res.status(201).json({ success: true, message: "Tạo thiết bị thành công", data: created });
  } catch (error) {
    console.error("Lỗi khi tạo thiết bị:", error);
    res.status(500).json({ success: false, message: "Lỗi khi tạo thiết bị", error: error.message });
  }
};

const updateEquipment = async (req, res) => {
  try {
    const { equipmentId } = req.params; // equipmentId trong params thực chất là _id
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
    const { equipmentId } = req.params; // equipmentId trong params thực chất là _id
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
    const { equipment, equipmentId, issueDescription, priority, severity, status, adminNotes, estimatedRepairCost, images } = req.body;
    
    // Hỗ trợ cả equipment và equipmentId
    const equipmentObjectId = equipment || equipmentId;
    
    if (!equipmentObjectId || !issueDescription) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin thiết bị hoặc mô tả lỗi" });
    }
    
    
    // Tạo EquipmentIssue với MongoDB tự sinh _id
    const issue = new EquipmentIssue({
      equipment: equipmentObjectId,
      reporter: staffId,
      issueDescription,
      priority,
      severity,
      status,
      adminNotes,
      estimatedRepairCost,
      images
    });
    
    await issue.save();
    res.status(201).json({ success: true, message: "Báo cáo thiết bị thành công", data: issue });
  } catch (error) {
    console.error("!!! LỖI reportEquipment:", error);
    res.status(500).json({ success: false, message: "Lỗi khi báo cáo thiết bị", error: error.message });
  }
};

const viewEquipmentIssues = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) {
      query.status = status; // Lọc theo trạng thái (ví dụ: 'reported', 'in_repair')
    }

    const issues = await EquipmentIssue.find(query)
      .populate({
        path: 'equipment',
        select: 'name model serialNumber' // Lấy thông tin thiết bị
      })
      .populate({
        path: 'reporter',
        select: 'user', // Lấy thông tin staff đã báo cáo
        populate: {
          path: 'user',
          select: 'fullName' // Lấy tên của staff đó
        }
      })
      .sort({ createdAt: -1 }); // Sắp xếp mới nhất lên đầu

    res.status(200).json({ 
      success: true, 
      message: "Lấy danh sách báo cáo sự cố thành công", 
      data: issues 
    });
  } catch (error) {
    console.error("!!! LỖI viewEquipmentIssues:", error); 
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi lấy danh sách báo cáo", 
      error: error.message 
    });
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
  viewEquipmentIssues,
  getOwnProfile
};


