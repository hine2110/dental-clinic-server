const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    workExperience: { type: String }, // Kinh nghiệm làm việc
    previousWorkplace: { type: String }, // Từng làm việc tại đâu
    collegeDegree: { type: String }, // Bằng cao đẳng
    universityDegree: { type: String }, // Bằng đại học
  },
  { _id: false } // không tạo _id riêng cho subdocument
);

const staffSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    staffType: {
      type: String,
      enum: ["receptionist", "storeKepper"],
      default: "receptionist"
    },
    profile: profileSchema,
    permissions: {
      // Receptionist permissions
      viewReceptionistSchedule: { type: Boolean, default: false }, // xem lịch làm việc
      viewPatientInfo: { type: Boolean, default: false }, // xem thông tin bệnh nhân
      editOwnProfile: { type: Boolean, default: false }, // chỉnh sửa hồ sơ cá nhân
      createInvoice: { type: Boolean, default: false }, // tạo hóa đơn
      
      // Store keeper permissions
      viewStoreKepperSchedule: { type: Boolean, default: false }, // xem lịch làm việc
      viewPrescriptions: { type: Boolean, default: false }, // xem đơn thuốc bác sĩ kê

      // Inventory management
      viewInventory: { type: Boolean, default: false }, // xem danh sách thuốc trong kho
      createMedicine: { type: Boolean, default: false }, // thêm thuốc vào kho
      updateMedicine: { type: Boolean, default: false }, // cập nhật thuốc trong kho
      deleteMedicine: { type: Boolean, default: false }, // loại bỏ thuốc khỏi kho

      // Equipment management
      viewEquipment: { type: Boolean, default: false }, // xem danh sách thiết bị
      createEquipment: { type: Boolean, default: false }, // thêm thiết bị
      updateEquipment: { type: Boolean, default: false }, // cập nhật thiết bị
      deleteEquipment: { type: Boolean, default: false }, // xóa thiết bị
      reportEquipment: { type: Boolean, default: false }, // báo cáo thiết bị hỏng

      // Profile
      editOwnProfileStore: { type: Boolean, default: false }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);
