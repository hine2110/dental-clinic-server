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


// 4. INVENTORY - Thuốc: xem, tạo, cập nhật, xóa
const viewInventory = async (req, res) => {
  try {
    // 1. Lấy ID cơ sở của nhân viên
    const { locationId } = req.query;
    if (!locationId) {
      return res.status(403).json({ success: false, message: "Không xác định được cơ sở của nhân viên" });
    }

    const { isActive } = req.query;
    
    // 2. Thêm location vào câu truy vấn
    const query = { location: locationId };
    
    if (isActive !== undefined) query.isActive = isActive === "true";

    const meds = await Medicine.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, message: "Lấy danh sách thuốc thành công", data: meds });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách thuốc", error: error.message });
  }
};



const createMedicine = async (req, res) => {
  try {
    // 1. SỬA: Lấy data từ req.body
    const data = req.body || {};
    
    // 2. SỬA: Kiểm tra 'data.location' (frontend đã gửi trong body)
    if (!data.location) { 
      return res.status(400).json({ success: false, message: "Thiếu thông tin cơ sở (location)" });
    }
    if (!data.name || !data.price) {
      return res.status(400).json({ success: false, message: "Thiếu tên thuốc hoặc giá" });
    }

    if (!data.medicineId) {
      // 3. SỬA: Đếm dựa trên 'data.location'
      const count = await Medicine.countDocuments({ location: data.location }); 
      data.medicineId = `MED${String(count + 1).padStart(4, "0")}`;
    }
    
    // 4. SỬA: Bỏ dòng 'data.location = storeLocationId;' vì nó đã có trong 'data'
    
    const created = new Medicine(data);
    await created.save();
    res.status(201).json({ success: true, message: "Tạo thuốc thành công", data: created });
  } catch (error) {
    if (error.code === 11000) {
       return res.status(409).json({ success: false, message: `Mã thuốc ${data.medicineId} đã tồn tại ở cơ sở này.` });
    }
    res.status(500).json({ success: false, message: "Lỗi khi tạo thuốc", error: error.message });
  }
};

const updateMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params; // Đây là _id của thuốc
    const update = req.body || {};

    // 1. SỬA: Lấy locationId từ req.query (URL)
    const { locationId } = req.query;
    if (!locationId) {
        return res.status(400).json({ success: false, message: "Thiếu tham số locationId trên URL" });
    }

    if (update.currentStock !== undefined) {
      // 2. SỬA: Dùng 'locationId' từ query
      const currentMedicine = await Medicine.findOne({ 
        _id: medicineId, 
        location: locationId 
      });
      
      if (!currentMedicine) {
        return res.status(404).json({ success: false, message: "Không tìm thấy thuốc tại cơ sở này" });
      }
      
      const currentStockInDB = Number(currentMedicine.currentStock) || 0;
      const currentStockToAdd = Number(update.currentStock) || 0;
      update.currentStock = currentStockInDB + currentStockToAdd;
    }
    
    // 3. SỬA: Dùng 'locationId' từ query
    const updated = await Medicine.findOneAndUpdate(
      { _id: medicineId, location: locationId }, 
      update, 
      { new: true, runValidators: true }
    );
    
    if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy thuốc hoặc bạn không có quyền cập nhật" });
    res.status(200).json({ success: true, message: "Cập nhật thuốc thành công", data: updated });
  } catch (error) {
    // Thêm xử lý ValidationError (gây ra lỗi 500 do CastError)
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      const message = error.message || "Lỗi xác thực dữ liệu";
      return res.status(400).json({ success: false, message: message });
    }
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật thuốc", error: error.message });
  }
};

const deleteMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params; // Đây là _id của thuốc
    
    // 1. SỬA: Lấy locationId từ req.query (URL)
    const { locationId } = req.query;
    if (!locationId) {
        return res.status(400).json({ success: false, message: "Thiếu tham số locationId trên URL" });
    }
    
    // 2. SỬA: Dùng 'locationId' từ query
    const deleted = await Medicine.findOneAndDelete({ 
      _id: medicineId, 
      location: locationId
    });
    
    if (!deleted) return res.status(404).json({ success: false, message: "Không tìm thấy thuốc" });
    res.status(200).json({ success: true, message: "Xóa thuốc thành công", data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi xóa thuốc", error: error.message });
  }
};

// 5. EQUIPMENT - xem, tạo, cập nhật, xóa
const viewEquipment = async (req, res) => {
  try {
    // 1. SỬA: Lấy locationId từ req.query
    const { locationId } = req.query; 

    // 2. SỬA: Kiểm tra locationId (và đổi 403 thành 400)
    if (!locationId) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin cơ sở (locationId)" });
    }

    const { isActive } = req.query;
    
    // 3. Giờ 'query' đã đúng
    const query = { location: locationId }; 
    if (isActive !== undefined) query.isActive = isActive === "true";
    
    const equipment = await Equipment.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, message: "Lấy danh sách thiết bị thành công", data: equipment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách thiết bị", error: error.message });
  }
};

const createEquipment = async (req, res) => {
  try {
    // 1. SỬA: Lấy data từ req.body
    const data = req.body || {};
    
    // 2. SỬA: Kiểm tra location từ body (client đã gửi)
    if (!data.location) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin cơ sở (location)" });
    }
    if (!data.name) {
      return res.status(400).json({ success: false, message: "Thiếu tên thiết bị" });
    }
    
    // 3. 'data' đã chứa 'location' từ client
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
    const { equipmentId } = req.params; // _id của thiết bị
    const update = req.body || {};

    // 1. SỬA: Lấy locationId từ req.query
    // Client cần gửi: PUT .../equipment/123?locationId=ABC
    const { locationId } = req.query;
    if (!locationId) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin cơ sở (locationId) để xác thực" });
    }
    
    // 2. SỬA: Thêm location vào điều kiện update
    const updated = await Equipment.findOneAndUpdate(
      { _id: equipmentId, location: locationId }, // Chỉ update nếu thuộc cơ sở
      update, 
      { new: true, runValidators: true }
    );
    
    if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị tại cơ sở này" });
    res.status(200).json({ success: true, message: "Cập nhật thiết bị thành công", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật thiết bị", error: error.message });
  }
};

const deleteEquipment = async (req, res) => {
  try {
    const { equipmentId } = req.params; // _id của thiết bị

    // 1. SỬA: Lấy locationId từ req.query
    // Client cần gửi: DELETE .../equipment/123?locationId=ABC
    const { locationId } = req.query;
    if (!locationId) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin cơ sở (locationId) để xác thực" });
    }

    // 2. SỬA: Thêm location vào điều kiện delete
    const deleted = await Equipment.findOneAndDelete({ 
      _id: equipmentId, 
      location: locationId 
    });
    
    if (!deleted) return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị tại cơ sở này" });
    res.status(200).json({ success: true, message: "Xóa thiết bị thành công", data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi xóa thiết bị", error: error.message });
  }
};
// 6. Báo cáo thiết bị bị hỏng
const reportEquipment = async (req, res) => {
  try {
    const staffId = req.staff._id; // ID của nhân viên báo cáo
    
    const { equipment, equipmentId, issueDescription, ...otherData } = req.body;
    const equipmentObjectId = equipment || equipmentId;
    
    if (!equipmentObjectId || !issueDescription) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin thiết bị hoặc mô tả lỗi" });
    }

    // SỬA: Không cần kiểm tra location ở đây
    // Logic của viewEquipmentIssues đã lọc theo location
    // Chỉ cần đảm bảo thiết bị tồn tại
    const targetEquipment = await Equipment.findById(equipmentObjectId);

    if (!targetEquipment) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị này." });
    }
    
    const issue = new EquipmentIssue({
      equipment: equipmentObjectId,
      reporter: staffId,
      issueDescription,
      ...otherData
    });
    await issue.save();

    // Cập nhật trạng thái thiết bị
    targetEquipment.status = otherData.status === 'in_repair' ? 'in_repair' : 'maintenance';
    await targetEquipment.save();

    res.status(201).json({ success: true, message: "Báo cáo thiết bị thành công", data: issue });
  } catch (error) {
    console.error("!!! LỖI reportEquipment:", error);
    res.status(500).json({ success: false, message: "Lỗi khi báo cáo thiết bị", error: error.message });
  }
};

const viewEquipmentIssues = async (req, res) => {
  try {
    // 1. Code của bạn ở đây đã đúng!
    const { locationId } = req.query;
    if (!locationId) {
      // Sửa 403 thành 400
      return res.status(400).json({ success: false, message: "Thiếu thông tin cơ sở (locationId)" });
    }

    // 2. Lấy danh sách ID của các thiết bị tại cơ sở này
    const locationEquipment = await Equipment.find({ location: locationId }).select('_id');
    const equipmentIds = locationEquipment.map(e => e._id);

    // 3. Xây dựng query cho EquipmentIssue
    const { status } = req.query;
    const query = {
      equipment: { $in: equipmentIds } 
    };
    if (status) {
      query.status = status;
    }

    // 4. Tìm các issue
    const issues = await EquipmentIssue.find(query)
      .populate(/* ... */)
      .populate(/* ... */)
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      message: "Lấy danh sách báo cáo sự cố thành công", 
      data: issues 
    });
  } catch (error) {
    // ...
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


