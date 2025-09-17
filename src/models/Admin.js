const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Populate user data when querying admins
adminSchema.pre(/^find/, function () {
  this.populate({
    path: "user",
    select: "fullName email phone role",
  });
});

module.exports = mongoose.model("Admin", adminSchema);
