const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: {
      type: String,
      unique: true,
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: [true, "Appointment is required"],
    },
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
    medications: {
      type: String,
      required: [true, "Medications is required"],
      trim: true,
    },
    instructions: {
      type: String,
      required: [true, "Instructions is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "dispensed", "completed"],
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate prescription ID before saving
prescriptionSchema.pre("save", async function (next) {
  if (!this.prescriptionId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const count = await this.constructor.countDocuments({
      prescriptionId: new RegExp(`^RX${year}${month}`),
    });
    this.prescriptionId = `RX${year}${month}${String(count + 1).padStart(
      4,
      "0"
    )}`;
  }
  next();
});

// Populate references when querying
prescriptionSchema.pre(/^find/, function () {
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
    })
    .populate({
      path: "appointment",
      select: "appointmentId appointmentDate type",
    });
});

// Virtual for patient name (denormalized for performance)
prescriptionSchema.virtual("patientName").get(function () {
  return this.patient?.user?.fullName || "Unknown Patient";
});

// Virtual for doctor name (denormalized for performance)
prescriptionSchema.virtual("doctorName").get(function () {
  return this.doctor?.user?.fullName || "Unknown Doctor";
});

// Virtual for staff name (denormalized for performance)
prescriptionSchema.virtual("staffName").get(function () {
  return this.staff?.user?.fullName || "Unknown Staff";
});

// Index for efficient queries
prescriptionSchema.index({ createdAt: -1 });
prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ doctor: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1 });

module.exports = mongoose.model("Prescription", prescriptionSchema);
