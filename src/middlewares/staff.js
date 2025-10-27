const Staff = require("../models/Staff");
const Management = require("../models/Management");
// Middleware kiểm tra quyền staff
const checkStaffRole = async (req, res, next) => {
  try {
    if (req.user.role !== "staff") {
      return res.status(403).json({
        success: false,
        message: "Chỉ staff mới có thể truy cập chức năng này",
      });
    }
    
    // Lấy thông tin staff chi tiết để kiểm tra permissions
    console.log('🔍 Debug - User ID:', req.user.id);
    console.log('🔍 Debug - User role:', req.user.role);
    
    let staff = await Staff.findOne({ user: req.user.id });
    console.log('🔍 Debug - Staff found (Staff model):', staff);

    if (!staff) {
      const management = await Management.findOne({ user: req.user.id });
      console.log('🔍 Debug - Staff found (Management model):', management);
      if (!management) {
        // Debug: Kiểm tra tất cả staff trong database
        const allStaff = await Staff.find({});
        const allManagement = await Management.find({});
        console.log('🔍 Debug - All Staff in DB:', allStaff.map(s => ({ id: s._id, user: s.user, staffType: s.staffType })));
        console.log('🔍 Debug - All Management in DB:', allManagement.map(m => ({ id: m._id, user: m.user, staffType: m.staffType })));
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông tin staff",
          debug: {
            userId: req.user.id,
            userRole: req.user.role,
            totalStaffInDB: allStaff.length,
            totalManagementInDB: allManagement.length
          }
        });
      }
      staff = management;
    }

    req.staff = staff; // Gắn thông tin staff vào request
    next();
  } catch (error) {
    console.error('Check staff role error:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi kiểm tra quyền staff",
      error: error.message
    });
  }
};

// Middleware kiểm tra permission cụ thể
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.staff || !req.staff.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền "${permission}"`,
      });
    }
    next();
  };
};

// Middleware kiểm tra staff type
const checkStaffType = (staffType) => {
  return (req, res, next) => {
    if (!req.staff || req.staff.staffType !== staffType) {
      return res.status(403).json({
        success: false,
        message: `Chỉ staff loại "${staffType}" mới có thể truy cập chức năng này`,
      });
    }
    next();
  };
};

module.exports = {
  checkStaffRole,
  checkPermission,
  checkStaffType
};




