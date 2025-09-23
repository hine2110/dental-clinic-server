# 🧪 HƯỚNG DẪN TEST RECEPTIONIST API BẰNG POSTMAN

## 📋 TỔNG QUAN

Hướng dẫn này sẽ giúp bạn test tất cả các chức năng của `receptionistStaffController` bằng Postman.

**Base URL:** `http://localhost:3000/api/staff`

**Authentication:** Tất cả requests cần có JWT token trong header `Authorization: Bearer <token>`

---

## 🔐 BƯỚC 1: AUTHENTICATION

### 1.1 Đăng nhập để lấy token
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "receptionist@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

### 1.2 Copy token và thêm vào Postman
- Vào **Authorization** tab
- Chọn **Bearer Token**
- Paste token vào ô **Token**

---

## 🏥 BƯỚC 2: QUẢN LÝ CƠ SỞ (LOCATIONS)

### 2.1 Lấy danh sách cơ sở
```http
GET http://localhost:3000/api/staff/locations
```

**Query Parameters (Optional):**
- `isActive=true` - Chỉ lấy cơ sở đang hoạt động

### 2.2 Tạo cơ sở mới
```http
POST http://localhost:3000/api/staff/locations
Content-Type: application/json

{
  "locationId": "LOC003",
  "name": "Cơ sở Quận 3",
  "address": "789 Lê Văn Sỹ, Quận 3, TP.HCM",
  "phone": "028 9999 8888",
  "email": "q3@dentalclinic.com",
  "description": "Cơ sở mới tại Quận 3",
  "operatingHours": {
    "monday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "17:00"
    },
    "tuesday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "17:00"
    },
    "wednesday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "17:00"
    },
    "thursday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "17:00"
    },
    "friday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "17:00"
    },
    "saturday": {
      "isOpen": true,
      "openTime": "08:00",
      "closeTime": "17:00"
    },
    "sunday": {
      "isOpen": false,
      "openTime": "08:00",
      "closeTime": "17:00"
    }
  },
  "isActive": true,
  "capacity": 40,
  "facilities": ["parking", "wifi", "air_conditioning"]
}
```

### 2.3 Cập nhật cơ sở
```http
PUT http://localhost:3000/api/staff/locations/{locationId}
Content-Type: application/json

{
  "name": "Cơ sở Quận 3 - Cập nhật",
  "capacity": 50,
  "facilities": ["parking", "wifi", "air_conditioning", "wheelchair_access"]
}
```

---

## 👨‍⚕️ BƯỚC 3: QUẢN LÝ LỊCH LÀM VIỆC DOCTOR

### 3.1 Tạo lịch làm việc cho doctor
```http
POST http://localhost:3000/api/staff/schedules/doctors
Content-Type: application/json

{
  "doctorId": "507f1f77bcf86cd799439011",
  "locationId": "507f1f77bcf86cd799439012",
  "date": "2024-01-20",
  "startTime": "08:00",
  "endTime": "12:00",
  "isAvailable": true,
  "notes": "Ca sáng tại cơ sở Quận 1"
}
```

### 3.2 Lấy lịch làm việc của doctor
```http
GET http://localhost:3000/api/staff/schedules/doctors
```

**Query Parameters (Optional):**
- `doctorId=507f1f77bcf86cd799439011` - Lọc theo doctor
- `locationId=507f1f77bcf86cd799439012` - Lọc theo cơ sở
- `date=2024-01-20` - Lọc theo ngày
- `startDate=2024-01-15&endDate=2024-01-25` - Lọc theo khoảng thời gian
- `status=available` - Lọc theo trạng thái

### 3.3 Thống kê lịch làm việc doctor
```http
GET http://localhost:3000/api/staff/schedules/stats/doctors
```

**Query Parameters (Optional):**
- `startDate=2024-01-15` - Ngày bắt đầu
- `endDate=2024-01-25` - Ngày kết thúc
- `locationId=507f1f77bcf86cd799439012` - Lọc theo cơ sở

### 3.4 Thống kê giờ làm việc doctor
```http
GET http://localhost:3000/api/staff/schedules/doctors/working-hours?doctorId=507f1f77bcf86cd799439011&period=week
```

**Query Parameters:**
- `doctorId` (required) - ID của doctor
- `startDate` - Ngày bắt đầu (optional)
- `endDate` - Ngày kết thúc (optional)
- `period=week|month` - Chu kỳ thống kê

---

## 👥 BƯỚC 4: QUẢN LÝ LỊCH LÀM VIỆC STAFF

### 4.1 Tạo lịch làm việc cho staff
```http
POST http://localhost:3000/api/staff/schedules/staff
Content-Type: application/json

{
  "staffId": "507f1f77bcf86cd799439013",
  "locationId": "507f1f77bcf86cd799439012",
  "date": "2024-01-20",
  "startTime": "13:00",
  "endTime": "17:00",
  "isAvailable": true,
  "notes": "Ca chiều - Receptionist"
}
```

### 4.2 Lấy lịch làm việc của staff
```http
GET http://localhost:3000/api/staff/schedules/staff
```

**Query Parameters (Optional):**
- `staffId=507f1f77bcf86cd799439013` - Lọc theo staff
- `locationId=507f1f77bcf86cd799439012` - Lọc theo cơ sở
- `date=2024-01-20` - Lọc theo ngày
- `startDate=2024-01-15&endDate=2024-01-25` - Lọc theo khoảng thời gian
- `status=available` - Lọc theo trạng thái

### 4.3 Thống kê lịch làm việc staff
```http
GET http://localhost:3000/api/staff/schedules/stats/staff
```

**Query Parameters (Optional):**
- `startDate=2024-01-15` - Ngày bắt đầu
- `endDate=2024-01-25` - Ngày kết thúc
- `locationId=507f1f77bcf86cd799439012` - Lọc theo cơ sở

### 4.4 Thống kê giờ làm việc staff
```http
GET http://localhost:3000/api/staff/schedules/staff/working-hours?staffId=507f1f77bcf86cd799439013&period=week
```

**Query Parameters:**
- `staffId` (required) - ID của staff
- `startDate` - Ngày bắt đầu (optional)
- `endDate` - Ngày kết thúc (optional)
- `period=week|month` - Chu kỳ thống kê

---

## ⏰ BƯỚC 5: KIỂM TRA GIỜ LÀM VIỆC

### 5.1 Kiểm tra giờ làm việc còn lại

#### **Cho Doctor:**
```http
GET http://localhost:5000/api/staff/schedules/remaining-hours?doctorId=507f1f77bcf86cd799439011&date=2024-01-20
```

#### **Cho Staff:**
```http
GET http://localhost:5000/api/staff/schedules/remaining-hours?staffId=507f1f77bcf86cd799439032&date=2024-01-20
```

**Query Parameters:**
- `doctorId` (optional) - ID của doctor
- `staffId` (optional) - ID của staff  
- `date` (required) - Ngày kiểm tra
- **Lưu ý:** Cần có ít nhất 1 trong 2: `doctorId` hoặc `staffId`

---

## 📅 BƯỚC 6: QUẢN LÝ LỊCH HẸN

### 6.1 Lấy danh sách lịch hẹn chờ duyệt
```http
GET http://localhost:3000/api/staff/appointments/pending
```

**Query Parameters (Optional):**
- `date=2024-01-20` - Lọc theo ngày
- `doctorId=507f1f77bcf86cd799439011` - Lọc theo doctor

### 6.2 Lấy tất cả lịch hẹn
```http
GET http://localhost:3000/api/staff/appointments
```

**Query Parameters (Optional):**
- `status=pending|confirmed|cancelled` - Lọc theo trạng thái
- `date=2024-01-20` - Lọc theo ngày
- `doctorId=507f1f77bcf86cd799439011` - Lọc theo doctor

### 6.3 Chấp nhận lịch hẹn của bệnh nhân
```http
PUT http://localhost:3000/api/staff/appointments/{appointmentId}/accept
Content-Type: application/json

{
  "status": "confirmed"
}
```

---

## 🧪 BƯỚC 7: TEST CASES QUAN TRỌNG

### 7.1 Test tạo lịch trùng lặp (sẽ fail)
```http
POST http://localhost:3000/api/staff/schedules/doctors
Content-Type: application/json

{
  "doctorId": "507f1f77bcf86cd799439011",
  "locationId": "507f1f77bcf86cd799439012",
  "date": "2024-01-20",
  "startTime": "08:00",
  "endTime": "12:00",
  "isAvailable": true,
  "notes": "Lịch trùng lặp - sẽ bị lỗi"
}
```

### 7.2 Test vượt quá 52 giờ/tuần (sẽ fail)
```http
POST http://localhost:3000/api/staff/schedules/doctors
Content-Type: application/json

{
  "doctorId": "507f1f77bcf86cd799439011",
  "locationId": "507f1f77bcf86cd799439012",
  "date": "2024-01-20",
  "startTime": "08:00",
  "endTime": "20:00",
  "isAvailable": true,
  "notes": "Lịch 12 giờ - có thể vượt quá 52h/tuần"
}
```

### 7.3 Test thời gian không hợp lệ (sẽ fail)
```http
POST http://localhost:3000/api/staff/schedules/doctors
Content-Type: application/json

{
  "doctorId": "507f1f77bcf86cd799439011",
  "locationId": "507f1f77bcf86cd799439012",
  "date": "2024-01-20",
  "startTime": "15:00",
  "endTime": "10:00",
  "isAvailable": true,
  "notes": "End time trước start time - sẽ bị lỗi"
}
```

---

## 📊 BƯỚC 8: KIỂM TRA THÔNG BÁO

Sau khi tạo lịch làm việc, kiểm tra collection `notifications` trong MongoDB:

```javascript
// Kiểm tra thông báo cho doctor
db.notifications.find({
  "type": "doctor_schedule_assigned",
  "recipientModel": "Doctor"
})

// Kiểm tra thông báo cho staff
db.notifications.find({
  "type": "staff_schedule_assigned", 
  "recipientModel": "Staff"
})

// Kiểm tra thông báo chung
db.notifications.find({
  "type": "schedule_update",
  "recipientModel": "User"
})
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Authentication:** Tất cả requests cần JWT token hợp lệ
2. **Permissions:** User phải có quyền `manageDoctorSchedule` và `acceptPatientBooking`
3. **ObjectId:** Thay thế các ObjectId mẫu bằng ID thực tế từ database
4. **Validation:** Hệ thống sẽ validate:
   - Thời gian hợp lệ (HH:MM format)
   - End time phải sau start time
   - Không trùng lịch trong cùng ngày
   - Không vượt quá 52 giờ/tuần
   - Trong giờ hoạt động của cơ sở

5. **Error Handling:** Kiểm tra response status:
   - `200` - Thành công
   - `400` - Dữ liệu không hợp lệ
   - `401` - Chưa xác thực
   - `403` - Không có quyền
   - `404` - Không tìm thấy
   - `500` - Lỗi server

---

## 🎯 KẾT QUẢ MONG ĐỢI

Sau khi test thành công, bạn sẽ thấy:
- ✅ Lịch làm việc được tạo và lưu vào database
- ✅ Thông báo được gửi đến đúng người nhận
- ✅ Validation hoạt động chính xác
- ✅ Thống kê hiển thị đúng dữ liệu
- ✅ API responses có cấu trúc JSON chuẩn

**Chúc bạn test thành công! 🚀**
