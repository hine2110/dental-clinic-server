const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    locationId: { 
      type: String, 
      unique: true, 
      required: true,
      trim: true 
    },
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    address: { 
      type: String, 
      required: true, 
      trim: true 
    },
    phone: { 
      type: String, 
      trim: true 
    },
    email: { 
      type: String, 
      trim: true 
    },
    description: { 
      type: String, 
      trim: true 
    },
    // Thông tin quản lý
    manager: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Staff" 
    },
    // Giờ hoạt động
    operatingHours: {
      monday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "17:00" }
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "17:00" }
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "17:00" }
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "17:00" }
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "17:00" }
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "17:00" }
      },
      sunday: {
        isOpen: { type: Boolean, default: false },
        openTime: { type: String, default: "08:00" },
        closeTime: { type: String, default: "17:00" }
      }
    },
    // Trạng thái
    isActive: { 
      type: Boolean, 
      default: true 
    },
    // Thông tin bổ sung
    capacity: { 
      type: Number, 
      default: 0 // Số lượng bệnh nhân tối đa có thể phục vụ
    },
    facilities: [{ 
      type: String, 
      trim: true 
    }], // Danh sách tiện ích: "parking", "wheelchair_access", "wifi", etc.
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh
locationSchema.index({ locationId: 1 });
locationSchema.index({ isActive: 1 });

module.exports = mongoose.model("Location", locationSchema);
