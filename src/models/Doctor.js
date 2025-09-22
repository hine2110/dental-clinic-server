const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    doctorId: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    license: { type: String, trim: true },
    specializations: { type: String, trim: true },
    workSchedule: { type: String, trim: true },
    consultationFee: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
