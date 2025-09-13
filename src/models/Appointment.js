const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor is required']
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  appointmentTime: {
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
    }
  },
  appointmentType: {
    type: String,
    enum: [
      'consultation',
      'cleaning',
      'checkup',
      'treatment',
      'surgery',
      'emergency',
      'follow-up',
      'orthodontic',
      'cosmetic'
    ],
    required: [true, 'Appointment type is required']
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  reasonForVisit: {
    type: String,
    required: [true, 'Reason for visit is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters'],
    trim: true
  },
  symptoms: [{
    type: String,
    trim: true
  }],
  notes: {
    patientNotes: { type: String, trim: true },
    doctorNotes: { type: String, trim: true },
    receptionistNotes: { type: String, trim: true }
  },
  treatment: {
    diagnosis: { type: String, trim: true },
    treatmentPlan: [{ type: String, trim: true }],
    prescriptions: [{
      medication: { type: String, trim: true },
      dosage: { type: String, trim: true },
      instructions: { type: String, trim: true },
      duration: { type: String, trim: true }
    }],
    procedures: [{
      name: { type: String, trim: true },
      description: { type: String, trim: true },
      duration: { type: Number }, // in minutes
      cost: { type: Number, min: 0 }
    }]
  },
  billing: {
    totalAmount: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank-transfer', 'insurance'],
      default: 'cash'
    },
    insuranceClaim: {
      claimNumber: { type: String, trim: true },
      claimStatus: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
      claimAmount: { type: Number, min: 0 }
    }
  },
  followUp: {
    isRequired: { type: Boolean, default: false },
    scheduledDate: { type: Date },
    reason: { type: String, trim: true }
  },
  reminders: {
    emailSent: { type: Boolean, default: false },
    smsSent: { type: Boolean, default: false },
    lastReminderSent: { type: Date }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate appointment ID before saving
appointmentSchema.pre('save', async function(next) {
  if (!this.appointmentId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments({
      appointmentId: new RegExp(`^APT${year}${month}`)
    });
    this.appointmentId = `APT${year}${month}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Populate patient and doctor data when querying appointments
appointmentSchema.pre(/^find/, function() {
  this.populate({
    path: 'patient',
    populate: {
      path: 'user',
      select: 'firstName lastName email phone'
    }
  }).populate({
    path: 'doctor',
    populate: {
      path: 'user',
      select: 'firstName lastName email'
    }
  }).populate({
    path: 'createdBy lastModifiedBy',
    select: 'firstName lastName email role'
  });
});

// Virtual for appointment duration in minutes
appointmentSchema.virtual('duration').get(function() {
  if (this.appointmentTime && this.appointmentTime.startTime && this.appointmentTime.endTime) {
    const [startHour, startMin] = this.appointmentTime.startTime.split(':').map(Number);
    const [endHour, endMin] = this.appointmentTime.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes - startMinutes;
  }
  return null;
});

// Virtual for full appointment datetime
appointmentSchema.virtual('fullDateTime').get(function() {
  if (this.appointmentDate && this.appointmentTime && this.appointmentTime.startTime) {
    const date = new Date(this.appointmentDate);
    const [hour, minute] = this.appointmentTime.startTime.split(':').map(Number);
    date.setHours(hour, minute, 0, 0);
    return date;
  }
  return null;
});

// Virtual for balance due
appointmentSchema.virtual('balanceDue').get(function() {
  return this.billing.totalAmount - this.billing.paidAmount;
});

// Index for efficient queries
appointmentSchema.index({ appointmentDate: 1, doctor: 1 });
appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
