const mongoose = require("mongoose");

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    notes: { type: String, trim: true }, // Ghi chú về lịch làm việc
    maxAppointments: { type: Number, default: 10 }, // Số lượng lịch hẹn tối đa
    currentAppointments: { type: Number, default: 0 }, // Số lượng lịch hẹn hiện tại
    breakTime: {
      startTime: { type: String }, // Giờ nghỉ trưa bắt đầu
      endTime: { type: String },   // Giờ nghỉ trưa kết thúc
      duration: { type: Number }   // Thời gian nghỉ (phút)
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled"],
      default: "scheduled"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorSchedule", doctorScheduleSchema);
