const path = require("path");
const fs = require("fs");

// ==================== UPLOAD IMAGE ====================
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Không có file được upload",
      });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `http://localhost:5000/uploads/${req.file.filename}`,
    };

    res.status(200).json({
      success: true,
      message: "Upload ảnh thành công",
      data: fileInfo,
    });
  } catch (error) {
    console.error("Upload image error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi upload ảnh",
    });
  }
};

// ==================== DELETE IMAGE ====================
const deleteImage = async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: "Tên file không hợp lệ",
      });
    }

    const filePath = path.join(__dirname, "../../uploads", filename);

    // Kiểm tra file có tồn tại không
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      res.status(200).json({
        success: true,
        message: "Xóa ảnh thành công",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "File không tồn tại",
      });
    }
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa ảnh",
    });
  }
};

// ==================== GET IMAGE ====================
const getImage = async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: "Tên file không hợp lệ",
      });
    }

    const filePath = path.join(__dirname, "../../uploads", filename);

    // Kiểm tra file có tồn tại không
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({
        success: false,
        message: "File không tồn tại",
      });
    }
  } catch (error) {
    console.error("Get image error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy ảnh",
    });
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  getImage,
};
