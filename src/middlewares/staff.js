const Staff = require("../models/Staff");

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
    
    const staff = await Staff.findOne({ user: req.user.id });
    console.log('🔍 Debug - Staff found:', staff);
    
    if (!staff) {
      // Debug: Kiểm tra tất cả staff trong database
      const allStaff = await Staff.find({});
      console.log('🔍 Debug - All staff in DB:', allStaff.map(s => ({ id: s._id, user: s.user, staffType: s.staffType })));
      
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin staff",
        debug: {
          userId: req.user.id,
          userRole: req.user.role,
          totalStaffInDB: allStaff.length
        }
      });
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
