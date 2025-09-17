// Export all models from a single file for easy importing
const User = require("./User");
const Admin = require("./Admin");
const Doctor = require("./Doctor");
const Staff = require("./Staff");
const Patient = require("./Patient");
const DoctorSchedule = require("./DoctorSchedule");
const Appointment = require("./Appointment");
const Service = require("./Service");
const Equipment = require("./Equipment");
const Invoice = require("./Invoice");
const Prescription = require("./Prescription");
const Medicine = require("./Medicine");

module.exports = {
  User,
  Admin,
  Doctor,
  Staff,
  Patient,
  DoctorSchedule,
  Appointment,
  Service,
  Equipment,
  Invoice,
  Prescription,
  Medicine,
};
