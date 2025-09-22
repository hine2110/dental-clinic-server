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
          "viewUserAccounts",
          "viewRevenueStatistics",
          "viewEquipmentIssues",
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
