// Export all models from a single file for easy importing
const User = require('./User');
const Patient = require('./Patient');
const Doctor = require('./Doctor');
const Appointment = require('./Appointment');
const Service = require('./Service');
const Medicine = require('./Medicine');
const Equipment = require('./Equipment');
const Invoice = require('./Invoice');
const Prescription = require('./Prescription');

module.exports = {
  User,
  Patient,
  Doctor,
  Appointment,
  Service,
  Medicine,
  Equipment,
  Invoice,
  Prescription
};
