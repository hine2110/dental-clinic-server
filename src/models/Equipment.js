const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    equipmentId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Equipment name is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Equipment category is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["operational", "maintenance", "repair"],
      default: "operational",
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: [true, "Purchase date is required"],
    },
    nextMaintenance: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate equipment ID before saving
equipmentSchema.pre("save", async function (next) {
  if (!this.equipmentId) {
    const count = await this.constructor.countDocuments();
    this.equipmentId = `EQ${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Index for efficient searches
equipmentSchema.index({ name: "text" });
equipmentSchema.index({ category: 1, status: 1 });
equipmentSchema.index({ nextMaintenance: 1 });

module.exports = mongoose.model("Equipment", equipmentSchema);
