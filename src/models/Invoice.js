const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      unique: true,
      required: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: [true, "Staff is required"],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    total: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount must be positive"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "insurance"],
      default: "cash",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate invoice ID before saving
invoiceSchema.pre("save", async function (next) {
  if (!this.invoiceId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const count = await this.constructor.countDocuments({
      invoiceId: new RegExp(`^INV${year}${month}`),
    });
    this.invoiceId = `INV${year}${month}${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Populate references when querying
invoiceSchema.pre(/^find/, function () {
  this.populate({
    path: "patient",
    populate: {
      path: "user",
      select: "fullName email phone",
    },
  }).populate({
    path: "staff",
    populate: {
      path: "user",
      select: "fullName email phone",
    },
  });
});

// Virtual for patient name (denormalized for performance)
invoiceSchema.virtual("patientName").get(function () {
  return this.patient?.user?.fullName || "Unknown Patient";
});

// Virtual for staff name (denormalized for performance)
invoiceSchema.virtual("staffName").get(function () {
  return this.staff?.user?.fullName || "Unknown Staff";
});

// Virtual for formatted total amount
invoiceSchema.virtual("formattedTotal").get(function () {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(this.total);
});

// Index for efficient queries
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ patient: 1, invoiceDate: -1 });
invoiceSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
