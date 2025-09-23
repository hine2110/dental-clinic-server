const { Patient, User } = require("../models");
const { validatePatientProfile } = require("../utils/validation");

//lay thong tin profile
const getPatientProfile = async (req, res) => {
    try{
        const patient = await Patient.findOne({ user: req.user._id })
            .populate('user', 'email firsName lastName role');
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found"
            });
        }

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error("Get patient profile error:", error);
        res.status(500).json({
            success: false,
            message: "Server error getting patient profile"
        });
    }
};

// tao hoac cap nhat profile
const createOrUpdateProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        //validate input data
        const validation = validatePatientProfile(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.errors
            });
        }

        const {
            basicInfo,
            medicalHistory = [],
            allergies = [],
            contactInfo,
            emergencyContact = {},
            insuranceInfo = ""
        } = req.body;

        //tim hoac tao patient profile
        let patient = await Patient.findOne({ user: userId });

        if (patient) {
            //cap nhat profile hien co 
            patient.basicInfo = { ...patient.basicInfo, ...basicInfo };
            patient.medicalHistory = medicalHistory;
            patient.allergies = allergies;
            patient.contactInfo = contactInfo;
            patient.emergencyContact = { ...patient.emergencyContact, ...emergencyContact };
            patient.insuranceInfo = insuranceInfo;
            patient.isProfileComplete = true;
            patient.completedAt = new Date();

            await patient.save();
        } else {
            //tao profile moi 
            patient = await Patient.create({
                user: userId,
                basicInfo,
                medicalHistory,
                allergies,
                contactInfo,
                emergencyContact,
                insuranceInfo,
                isProfileComplete: true,
                completedAt: new Date()
            });
        }

        //cap nhat trang thai profile trong user model
        await User.findByIdAndUpdate(userId, {
            isProfileComplete: true
        });

        res.status(201).json({
            success: true,
            message: "Patient profile saved successfully",
            data: patient
        });
    } catch (error) {
        console.error("Create/update patient profile error:", error);

        if (error.name === "ValidationError") {
            const message = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: messages
            });
        }
        res.status(500).json({
            success: false,
            message: "Server error saving patient profile"
        });
    }
};

// kiem tra trang thai hoan thanh 
const getProfileStatus = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user: req.user._id });

        if (!patient){
            return res.json({
                success: true,
                data: {
                    isProfileComplete: false,
                    hashProfile: false
                }
            });
        }
        
        res.json({
            success: true,
            data: {
                isProfileComplete: patient.isProfileComplete,
                hashProfile: true,
                completedAt: patient.completedAt
            }
        });
    } catch (error) {
        console.error("Get profile status error:", error);
        res.status(500).json({
            success: false,
            message: "Server error getting profile status"
        });
    }
};

module.exports = {
    getPatientProfile,
    createOrUpdateProfile,
    getProfileStatus
};