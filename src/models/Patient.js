const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientId: {
    type: String,
    unique: true
  },
  emergencyContact: {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone: { 
      type: String, 
      required: true,
      match: [/^[0-9+\-\s()]+$/, 'Please provide a valid phone number']
    }
  },
  medicalHistory: {
    allergies: [{ type: String, trim: true }],
    medications: [{ 
      name: { type: String, trim: true },
      dosage: { type: String, trim: true },
      frequency: { type: String, trim: true }
    }],
    medicalConditions: [{ type: String, trim: true }],
    previousSurgeries: [{
      procedure: { type: String, trim: true },
      date: { type: Date },
      notes: { type: String, trim: true }
    }]
  },
  dentalHistory: {
    previousDentist: { type: String, trim: true },
    lastCleaningDate: { type: Date },
    lastExamDate: { type: Date },
    orthodonticTreatment: { type: Boolean, default: false },
    dentalAnxiety: { 
      type: String, 
      enum: ['none', 'mild', 'moderate', 'severe'],
      default: 'none'
    }
  },
  insurance: {
    provider: { type: String, trim: true },
    policyNumber: { type: String, trim: true },
    groupNumber: { type: String, trim: true },
    subscriberId: { type: String, trim: true },
    relationToSubscriber: { 
      type: String, 
      enum: ['self', 'spouse', 'child', 'other'],
      default: 'self'
    }
  },
  preferences: {
    preferredDoctor: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    },
    communicationMethod: {
      type: String,
      enum: ['phone', 'email', 'sms'],
      default: 'phone'
    },
    appointmentReminders: {
      type: Boolean,
      default: true
    }
  },
  notes: [{ 
    note: { type: String, trim: true },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    createdAt: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate patient ID before saving
patientSchema.pre('save', async function(next) {
  if (!this.patientId) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      patientId: new RegExp(`^P${year}`)
    });
    this.patientId = `P${year}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Populate user data when querying patients
patientSchema.pre(/^find/, function() {
  this.populate({
    path: 'user',
    select: 'firstName lastName email phone dateOfBirth address'
  });
});

module.exports = mongoose.model('Patient', patientSchema);
