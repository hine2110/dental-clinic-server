const multer = require('multer');
const path = require('path');
const fs = require('fs');

//tao thu muc uploads neu chua co
const uploadDir = path.join(__dirname, '../uploads/id-cards');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

//cau hinh storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // tao file unique voi timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

//filter de chi cho phep up anh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startswith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

//cau hinh multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5mb 
  }
});

module.exports = { upload };  