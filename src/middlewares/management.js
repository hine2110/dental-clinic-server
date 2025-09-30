const Management = require("../models/Management");
// Middleware kiểm tra quyền management (chỉ Management được phép)
const checkManagementRole = async (req, res, next) => {
    try {
      if (req.user.role !== "management") {
        return res.status(403).json({
          success: false,
          message: "Chỉ management mới có thể truy cập chức năng này",
        });
      }
  
      const management = await Management.findOne({ user: req.user.id });
      if (!management) {
        return res.status(403).json({
          success: false,
          message: "Tài khoản không thuộc nhóm management",
        });
      }
  
      // Gắn thông tin management vào request
      req.management = management;
      next();
    } catch (error) {
      console.error('Check management role error:', error);
      res.status(500).json({
        success: false,
        message: "Lỗi kiểm tra quyền management",
        error: error.message
      });
    }
  };
  
  // Middleware kiểm tra permission cho Management
  const checkManagementPermission = (permission) => {
    return async (req, res, next) => {
      try {
        if (!req.management) {
          return res.status(401).json({ success: false, message: "Chưa xác thực management" });
        }

        const hasPermission = req.management.permissions && req.management.permissions[permission] === true;
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Management không có quyền "${permission}"`,
          });
        }
        next();
      } catch (error) {
        console.error('Check management permission error:', error);
        res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền management', error: error.message });
      }
    };
  };
  
  module.exports.checkManagementRole = checkManagementRole;
  module.exports.checkManagementPermission = checkManagementPermission;
  