# 🏥 Dental Clinic Management System - Backend API

## 📋 Mô tả

Backend API cho hệ thống quản lý phòng khám nha khoa với đầy đủ chức năng:
- Quản lý bệnh nhân và hồ sơ bệnh án
- Đặt lịch hẹn và theo dõi điều trị
- Quản lý bác sĩ và nhân viên
- Quản lý dịch vụ, thuốc và thiết bị
- Thanh toán và hóa đơn
- Kê toa thuốc

## 🚀 Công nghệ

- **Backend**: Node.js + Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + bcryptjs
- **Environment**: dotenv

## 📁 Cấu trúc dự án

```
src/
├── config/          # Cấu hình database
├── models/          # MongoDB schemas (9 models)
├── controllers/     # API controllers
├── routes/          # API routes  
├── middlewares/     # Authentication & validation
├── services/        # Business logic
└── uploads/         # File uploads
```

## 🏗️ Models

- **User** - Quản lý người dùng (4 roles: admin, doctor, staff, patient)
- **Patient** - Hồ sơ bệnh nhân chi tiết
- **Doctor** - Thông tin bác sĩ và chuyên khoa
- **Appointment** - Đặt lịch hẹn
- **Service** - Dịch vụ phòng khám
- **Medicine** - Quản lý thuốc
- **Equipment** - Trang thiết bị y tế
- **Invoice** - Hóa đơn thanh toán
- **Prescription** - Toa thuốc

## ⚙️ Cài đặt

### 1. Clone repository
```bash
git clone <repository-url>
cd dental-clinic-server
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình môi trường
Tạo file `.env`:
```
MONGODB_URI=mongodb://localhost:27017/dental_clinic
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

### 4. Chạy ứng dụng
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔐 API Endpoints (Đang phát triển)

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `GET /api/auth/me` - Lấy thông tin user

### Admin APIs
- Quản lý nhân sự
- Phân công lịch làm việc
- Thống kê doanh thu

### Doctor APIs  
- Xem lịch làm việc
- Khám bệnh và chuẩn đoán
- Kê toa thuốc

### Staff APIs
- Quản lý dịch vụ/thuốc/thiết bị
- Thanh toán hóa đơn

### Patient APIs
- Đặt lịch khám
- Xem thông tin bác sĩ
- Xem lịch sử khám bệnh

## 🛠️ Tình trạng phát triển

- ✅ Database models & schemas
- ✅ Server setup & MongoDB connection
- ✅ Authentication middleware
- ⏳ API endpoints (đang phát triển)
- ⏳ Business logic
- ⏳ Testing

## 👥 Roles & Permissions

1. **Admin** - Quản lý toàn hệ thống
2. **Doctor** - Khám bệnh và điều trị
3. **Staff** - Quản lý dịch vụ và thanh toán
4. **Patient** - Sử dụng dịch vụ phòng khám

---
*Dự án đang trong quá trình phát triển 🚧*
