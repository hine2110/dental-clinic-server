const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    permissions: [
      {
        type: String,
        enum: [
          "createDoctor&StaffAccount",
          "viewEquipment",
          "manageDoctor&StaffSchedule",
          "viewUserAccounts",
          "viewRevenueStatistics",
          "viewPatientStatistics",
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
