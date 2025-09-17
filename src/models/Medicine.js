const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor is required"],
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: [true, "Staff is required"],
    },
    medicineId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Medicine name is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Medicine category is required"],
      trim: true,
    },
    dosageForm: {
      type: String,
      required: [true, "Dosage form is required"],
      trim: true,
    },
    currentStock: {
      type: Number,
      required: [true, "Current stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate medicine ID before saving
medicineSchema.pre("save", async function (next) {
  if (!this.medicineId) {
    const count = await this.constructor.countDocuments();
    this.medicineId = `MED${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Populate references when querying
medicineSchema.pre(/^find/, function () {
  this.populate({
    path: "patient",
    populate: {
      path: "user",
      select: "fullName email phone",
    },
  })
    .populate({
      path: "doctor",
      populate: {
        path: "user",
        select: "fullName email phone",
      },
    })
    .populate({
      path: "staff",
      populate: {
        path: "user",
        select: "fullName email phone",
      },
    });
});

// Virtual for patient name (denormalized for performance)
medicineSchema.virtual("patientName").get(function () {
  return this.patient?.user?.fullName || "Unknown Patient";
});

// Virtual for doctor name (denormalized for performance)
medicineSchema.virtual("doctorName").get(function () {
  return this.doctor?.user?.fullName || "Unknown Doctor";
});

// Virtual for staff name (denormalized for performance)
medicineSchema.virtual("staffName").get(function () {
  return this.staff?.user?.fullName || "Unknown Staff";
});

// Virtual for formatted price
medicineSchema.virtual("formattedPrice").get(function () {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(this.price);
});

// Virtual for stock status
medicineSchema.virtual("stockStatus").get(function () {
  if (this.currentStock === 0) return "out-of-stock";
  if (this.currentStock <= 10) return "low-stock";
  return "in-stock";
});

// Virtual for days until expiry
medicineSchema.virtual("daysUntilExpiry").get(function () {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Index for efficient searches
medicineSchema.index({ name: "text" });
medicineSchema.index({ category: 1, isActive: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ currentStock: 1 });

module.exports = mongoose.model("Medicine", medicineSchema);
