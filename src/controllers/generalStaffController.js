const Equipment = require("../models/Equipment");
const EquipmentIssue = require("../models/EquipmentIssue");
const Medicine = require("../models/Medicine");

// ==================== GENERAL FUNCTIONS ====================

// 1. Báo cáo thiết bị hỏng
const reportEquipmentIssue = async (req, res) => {
  try {
    const { equipmentId, issueDescription, severity = "medium" } = req.body;
    const staffId = req.staff._id;

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị"
      });
    }

    const issue = new EquipmentIssue({
      equipment: equipmentId,
      reporter: staffId,
      issueDescription,
      severity
    });

    await issue.save();

    // Cập nhật trạng thái thiết bị
    equipment.status = "repair";
    await equipment.save();

    res.status(201).json({
      success: true,
      message: "Báo cáo thiết bị hỏng thành công",
      data: issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi báo cáo thiết bị",
      error: error.message
    });
  }
};

// 2. Xem danh sách thiết bị
const getEquipment = async (req, res) => {
  try {
    const { status, category } = req.query;

    let query = { isActive: true };
    if (status) query.status = status;
    if (category) query.category = category;

    const equipment = await Equipment.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách thiết bị thành công",
      data: equipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách thiết bị",
      error: error.message
    });
  }
};

// 3. Xem chi tiết thiết bị
const getEquipmentDetail = async (req, res) => {
  try {
    const { equipmentId } = req.params;

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị"
      });
    }

    // Lấy danh sách báo cáo sự cố của thiết bị
    const issues = await EquipmentIssue.find({ equipment: equipmentId })
      .populate('reporter', 'user')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết thiết bị thành công",
      data: {
        equipment,
        issues
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết thiết bị",
      error: error.message
    });
  }
};

// 4. Xem tồn kho thuốc
const getInventory = async (req, res) => {
  try {
    const { category, search, lowStock } = req.query;

    let query = { isActive: true };
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: "i" };
    if (lowStock === "true") {
      query.$expr = { $lte: ["$currentStock", "$minimumStock"] };
    }

    const medicines = await Medicine.find(query).sort({ name: 1 });

    // Thêm thông tin cảnh báo cho thuốc sắp hết
    const medicinesWithWarning = medicines.map(medicine => ({
      ...medicine.toObject(),
      isLowStock: medicine.currentStock <= medicine.minimumStock,
      warningLevel: medicine.currentStock <= medicine.minimumStock ? 
        (medicine.currentStock === 0 ? 'critical' : 'warning') : 'normal'
    }));

    res.status(200).json({
      success: true,
      message: "Lấy danh sách tồn kho thành công",
      data: medicinesWithWarning
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách tồn kho",
      error: error.message
    });
  }
};

// 5. Xem chi tiết thuốc
const getMedicineDetail = async (req, res) => {
  try {
    const { medicineId } = req.params;

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thuốc"
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết thuốc thành công",
      data: medicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết thuốc",
      error: error.message
    });
  }
};

// 6. Xem báo cáo sự cố thiết bị
const getEquipmentIssues = async (req, res) => {
  try {
    const { status, severity, equipmentId } = req.query;
    const staffId = req.staff._id;

    let query = { reporter: staffId };
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (equipmentId) query.equipment = equipmentId;

    const issues = await EquipmentIssue.find(query)
      .populate('equipment', 'name category status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách báo cáo sự cố thành công",
      data: issues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách báo cáo sự cố",
      error: error.message
    });
  }
};

// 7. Cập nhật báo cáo sự cố
const updateEquipmentIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { issueDescription, severity } = req.body;
    const staffId = req.staff._id;

    const issue = await EquipmentIssue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy báo cáo sự cố"
      });
    }

    if (issue.reporter.toString() !== staffId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật báo cáo này"
      });
    }

    if (issueDescription) issue.issueDescription = issueDescription;
    if (severity) issue.severity = severity;

    await issue.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật báo cáo sự cố thành công",
      data: issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật báo cáo sự cố",
      error: error.message
    });
  }
};

// 8. Thống kê tồn kho
const getInventoryStats = async (req, res) => {
  try {
    const totalMedicines = await Medicine.countDocuments({ isActive: true });
    const lowStockMedicines = await Medicine.countDocuments({
      isActive: true,
      $expr: { $lte: ["$currentStock", "$minimumStock"] }
    });
    const outOfStockMedicines = await Medicine.countDocuments({
      isActive: true,
      currentStock: 0
    });

    const totalValue = await Medicine.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ["$currentStock", "$price"] } } } }
    ]);

    res.status(200).json({
      success: true,
      message: "Lấy thống kê tồn kho thành công",
      data: {
        totalMedicines,
        lowStockMedicines,
        outOfStockMedicines,
        totalValue: totalValue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê tồn kho",
      error: error.message
    });
  }
};

module.exports = {
  reportEquipmentIssue,
  getEquipment,
  getEquipmentDetail,
  getInventory,
  getMedicineDetail,
  getEquipmentIssues,
  updateEquipmentIssue,
  getInventoryStats
};
