const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: String,
    unique: true
  },
  credentials: {
    medicalLicense: { 
      type: String, 
      required: true, 
      trim: true 
    },
    dentalLicense: { 
      type: String, 
      required: true, 
      trim: true 
    },
    certifications: [{ 
      name: { type: String, trim: true },
      issuedBy: { type: String, trim: true },
      dateIssued: { type: Date },
      expirationDate: { type: Date }
    }]
  },
  education: [{
    degree: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    graduationYear: { type: Number, required: true },
    fieldOfStudy: { type: String, trim: true }
  }],
  specializations: [{
    type: String,
    enum: [
      'General Dentistry',
      'Orthodontics',
      'Endodontics',
      'Periodontics',
      'Oral Surgery',
      'Prosthodontics',
      'Pediatric Dentistry',
      'Oral Pathology',
      'Cosmetic Dentistry',
      'Implantology'
    ]
  }],
  experience: {
    yearsOfPractice: { type: Number, required: true, min: 0 },
    previousPositions: [{
      position: { type: String, trim: true },
      clinic: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date },
      description: { type: String, trim: true }
    }]
  },
  workSchedule: [{
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: { type: String }, // Format: "09:00"
    endTime: { type: String },   // Format: "17:00"
    isAvailable: { type: Boolean, default: true }
  }],
  consultationFee: {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'VND' }
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 }
  },
  biography: {
    type: String,
    maxlength: [1000, 'Biography cannot exceed 1000 characters'],
    trim: true
  },
  languages: [{ 
    type: String, 
    trim: true,
    default: ['Vietnamese']
  }],
  isAcceptingNewPatients: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate doctor ID before saving
doctorSchema.pre('save', async function(next) {
  if (!this.doctorId) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      doctorId: new RegExp(`^DR${year}`)
    });
    this.doctorId = `DR${year}${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Populate user data when querying doctors
doctorSchema.pre(/^find/, function() {
  this.populate({
    path: 'user',
    select: 'firstName lastName email phone avatar'
  });
});

// Virtual for full schedule
doctorSchema.virtual('isAvailableToday').get(function() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaySchedule = this.workSchedule.find(schedule => 
    schedule.dayOfWeek === today && schedule.isAvailable
  );
  return !!todaySchedule;
});

module.exports = mongoose.model('Doctor', doctorSchema);
