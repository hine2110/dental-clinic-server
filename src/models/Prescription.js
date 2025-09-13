const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    unique: true,
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment reference is required']
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient reference is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor reference is required']
  },
  prescriptionDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  diagnosis: {
    type: String,
    required: [true, 'Diagnosis is required'],
    trim: true,
    maxlength: [500, 'Diagnosis cannot exceed 500 characters']
  },
  medications: [{
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true
    },
    dosage: {
      amount: {
        type: Number,
        required: [true, 'Dosage amount is required'],
        min: [0.1, 'Dosage amount must be positive']
      },
      unit: {
        type: String,
        enum: ['mg', 'g', 'ml', 'mcg', 'tablet', 'capsule', 'drop', 'spray'],
        required: [true, 'Dosage unit is required']
      }
    },
    frequency: {
      timesPerDay: {
        type: Number,
        required: [true, 'Times per day is required'],
        min: [1, 'Must be taken at least once per day'],
        max: [6, 'Cannot exceed 6 times per day']
      },
      schedule: [{
        type: String,
        enum: ['before-breakfast', 'after-breakfast', 'before-lunch', 'after-lunch', 
               'before-dinner', 'after-dinner', 'bedtime', 'as-needed', 'every-4-hours', 
               'every-6-hours', 'every-8-hours', 'every-12-hours']
      }]
    },
    duration: {
      value: {
        type: Number,
        required: [true, 'Duration value is required'],
        min: [1, 'Duration must be at least 1']
      },
      unit: {
        type: String,
        enum: ['day', 'week', 'month'],
        required: [true, 'Duration unit is required']
      }
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    instructions: {
      type: String,
      required: [true, 'Instructions are required'],
      trim: true,
      maxlength: [300, 'Instructions cannot exceed 300 characters']
    },
    warnings: [{
      type: String,
      trim: true
    }],
    refillable: {
      type: Boolean,
      default: false
    },
    refillsRemaining: {
      type: Number,
      default: 0,
      min: [0, 'Refills remaining cannot be negative']
    }
  }],
  generalInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'General instructions cannot exceed 500 characters']
  },
  warnings: [{
    type: String,
    trim: true
  }],
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    recommendedDate: { type: Date },
    reason: { type: String, trim: true }
  },
  status: {
    type: String,
    enum: ['active', 'dispensed', 'completed', 'cancelled', 'expired'],
    default: 'active'
  },
  dispensedBy: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dispensedDate: { type: Date },
    pharmacyNotes: { type: String, trim: true }
  },
  validity: {
    validUntil: {
      type: Date,
      required: true
    },
    isExpired: {
      type: Boolean,
      default: false
    }
  },
  digitalSignature: {
    doctorSignature: { type: String }, // Base64 encoded signature or signature URL
    signatureDate: { type: Date },
    isVerified: { type: Boolean, default: false }
  },
  notes: {
    doctorNotes: { type: String, trim: true },
    pharmacistNotes: { type: String, trim: true }
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

// Generate prescription ID before saving
prescriptionSchema.pre('save', async function(next) {
  if (!this.prescriptionId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments({
      prescriptionId: new RegExp(`^RX${year}${month}`)
    });
    this.prescriptionId = `RX${year}${month}${String(count + 1).padStart(4, '0')}`;
  }

  // Set validity period (default 30 days from prescription date)
  if (!this.validity.validUntil) {
    const validityDate = new Date(this.prescriptionDate);
    validityDate.setDate(validityDate.getDate() + 30);
    this.validity.validUntil = validityDate;
  }

  // Check if expired
  this.validity.isExpired = new Date() > this.validity.validUntil;

  next();
});

// Method to calculate total medications
prescriptionSchema.methods.getTotalMedications = function() {
  return this.medications.length;
};

// Method to calculate total quantity
prescriptionSchema.methods.getTotalQuantity = function() {
  return this.medications.reduce((total, med) => total + med.quantity, 0);
};

// Method to check if prescription can be refilled
prescriptionSchema.methods.canRefill = function(medicineId) {
  const medication = this.medications.find(med => 
    med.medicine.toString() === medicineId.toString()
  );
  
  if (!medication) return false;
  
  return medication.refillable && 
         medication.refillsRemaining > 0 && 
         !this.validity.isExpired &&
         this.status === 'active';
};

// Virtual for days until expiry
prescriptionSchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const expiry = new Date(this.validity.validUntil);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for prescription summary
prescriptionSchema.virtual('medicationSummary').get(function() {
  return this.medications.map(med => ({
    name: med.medicine.name || 'Unknown Medicine',
    dosage: `${med.dosage.amount}${med.dosage.unit}`,
    frequency: `${med.frequency.timesPerDay} times/day`,
    duration: `${med.duration.value} ${med.duration.unit}(s)`
  }));
});

// Populate references when querying
prescriptionSchema.pre(/^find/, function() {
  this.populate([
    { path: 'patient', populate: { path: 'user', select: 'firstName lastName email phone dateOfBirth' } },
    { path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } },
    { path: 'medications.medicine', select: 'name genericName strength category' },
    { path: 'dispensedBy.user', select: 'firstName lastName role' },
    { path: 'createdBy lastModifiedBy', select: 'firstName lastName role' }
  ]);
});

// Index for efficient queries
prescriptionSchema.index({ prescriptionDate: -1 });
prescriptionSchema.index({ patient: 1, prescriptionDate: -1 });
prescriptionSchema.index({ doctor: 1, prescriptionDate: -1 });
prescriptionSchema.index({ status: 1, 'validity.validUntil': 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
