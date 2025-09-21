const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    type: { type: String, enum: ['registration', 'password_reset'], required: true },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 10 * 60 * 1000) }, //10phut
    isUsed: { type: Boolean, default: false },
}, 

{ timestamps: true}

);

//tu dong xoa document het han
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Verification', verificationSchema);
