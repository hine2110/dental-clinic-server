const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true // Để tìm kiếm nhanh theo cơ sở
    },
    
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["operational", "maintenance", "repair", "out_of_order"],
      default: "operational",
    },
    purchaseDate: { type: Date },
    nextMaintenance: { type: Date },
    warrantyExpiry: { type: Date },
    supplier: { type: String, trim: true },
    model: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Tùy chọn: Đảm bảo SerialNumber là duy nhất cho mỗi cơ sở
equipmentSchema.index({ serialNumber: 1, location: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Equipment", equipmentSchema);