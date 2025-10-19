// Export all models from a single file for easy importing
const User = require("./User");
const Admin = require("./Admin");
const Doctor = require("./Doctor");
const Staff = require("./Staff");
const Patient = require("./Patient");
const DoctorSchedule = require("./DoctorSchedule");
const StaffSchedule = require("./StaffSchedule");
const Appointment = require("./Appointment");
const Service = require("./Service");
const Equipment = require("./Equipment");
const Invoice = require("./Invoice");
const Prescription = require("./Prescription");
const Medicine = require("./Medicine");
const Verification = require("./Verification");
const EquipmentIssue = require("./EquipmentIssue");
const Notification = require("./Notification");
const Management = require("./Management");
const MedicalRecord = require("./MedicalRecord");
const Location = require("./Location");

module.exports = {
  User,
  Admin,
  Doctor,
  Staff,
  Patient,
  DoctorSchedule,
  StaffSchedule,
  Appointment,
  Service,
  Equipment,
  Invoice,
  Prescription,
  Medicine,
  Verification,
  EquipmentIssue,
  Notification,
  Management,
  MedicalRecord,
  Location,
};
