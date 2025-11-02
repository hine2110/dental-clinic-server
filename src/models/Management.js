const mongoose = require("mongoose");

const managementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    staffType: {
      type: String,
      enum: ["management"],
      default: "management",
    },
    permissions: {
      // Scheduling permissions (management capabilities)
      createDoctorSchedule: { type: Boolean, default: true },
      createReceptionistSchedule: { type: Boolean, default: true },
      createStoreKepperSchedule: { type: Boolean, default: true },

      viewDoctorProfile: { type: Boolean, default: true },
      viewStaffProfile: { type: Boolean, default: true },

      viewDoctorSchedule: { type: Boolean, default: true },
      viewStaffSchedule: { type: Boolean, default: true },

      updateDoctorSchedule: { type: Boolean, default: true },
      updateStaffSchedule: { type: Boolean, default: true },

      deleteDoctorSchedule: { type: Boolean, default: true },
      deleteStaffSchedule: { type: Boolean, default: true },

      viewEquipmentDamageReports: { type: Boolean, default: true },
      updateEquipmentDamageReports: { type: Boolean, default: true },

      // Revenue analytics
      viewRevenueWeekly: { type: Boolean, default: true },
      viewRevenueMonthly: { type: Boolean, default: true },
      viewRevenueYearly: { type: Boolean, default: true },

      //location
      getAllLocations: { type: Boolean, default: true },
      createLocation: { type: Boolean, default: true },
      updateLocation: { type: Boolean, default: true },
      deleteLocation: { type: Boolean, default: true },
      viewLocation: { type: Boolean, default: true },
      
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Management", managementSchema);
