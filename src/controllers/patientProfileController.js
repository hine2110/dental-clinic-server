const { Patient, User } = require("../models");
const { validatePatientProfile } = require("../utils/validation");

//lay thong tin profile
const getPatientProfile = async (req, res) => {
    try{
        const patient = await Patient.findOne({ user: req.user._id })
            .populate('user', 'email firstName lastName role');
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
        const userEmail = req.user.email;

        const validation = validatePatientProfile(req.body);
        if (!validation.isValid) {
            console.log('❌ Validation failed:', validation.errors);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.errors
            });
        }
        
        console.log('✅ Validation passed');

        const {
            basicInfo,
            medicalHistory,
            allergies,
            contactInfo,
            emergencyContact = {},
            insuranceInfo = ""
        } = req.body;

        const finalContactInfo = { ...contactInfo, email: userEmail };
        // Xử lý medicalHistory và allergies - chuyển từ string sang array nếu cần
        let processedMedicalHistory = [];
        let processedAllergies = [];

        if (typeof medicalHistory === 'string' && medicalHistory.trim() !== '') {
            // Nếu là string, tạo array với 1 object
            processedMedicalHistory = [{ 
                condition: medicalHistory, 
                year: new Date().getFullYear(), 
                notes: '' 
            }];
        } else if (Array.isArray(medicalHistory)) {
            processedMedicalHistory = medicalHistory;
        }

        if (typeof allergies === 'string' && allergies.trim() !== '') {
            // Nếu là string, tạo array với 1 object
            processedAllergies = [{ 
                allergen: allergies, 
                severity: 'unknown', 
                reaction: '' 
            }];
        } else if (Array.isArray(allergies)) {
            processedAllergies = allergies;
        }

        //tim hoac tao patient profile
        let patient = await Patient.findOne({ user: userId });
        console.log('🔍 Existing patient found:', patient ? 'Yes' : 'No');

        if (patient) {
            //cap nhat profile hien co 
            patient.basicInfo = { 
                ...patient.basicInfo, 
                ...basicInfo,
                // Đảm bảo idCard chỉ chứa idNumber
                idCard: {
                    idNumber: basicInfo.idCard?.idNumber || patient.basicInfo.idCard?.idNumber
                }
            };
            patient.medicalHistory = processedMedicalHistory;
            patient.allergies = processedAllergies;
            patient.contactInfo = finalContactInfo;
            patient.emergencyContact = { ...patient.emergencyContact, ...emergencyContact };
            patient.insuranceInfo = insuranceInfo;
            patient.isProfileComplete = true;
            patient.completedAt = new Date();

            await patient.save();
            console.log('✅ Patient profile updated successfully');
        } else {
            //tao profile moi 
            const newPatientData = {
                user: userId,
                basicInfo: {
                    ...basicInfo,
                    // Đảm bảo idCard chỉ chứa idNumber
                    idCard: {
                        idNumber: basicInfo.idCard?.idNumber
                    }
                },
                medicalHistory: processedMedicalHistory,
                allergies: processedAllergies,
                contactInfo: finalContactInfo,
                emergencyContact,
                insuranceInfo,
                isProfileComplete: true,
                completedAt: new Date()
            };
            console.log('📝 New patient data:', JSON.stringify(newPatientData, null, 2));
            
            patient = await Patient.create(newPatientData);
            console.log('✅ New patient profile created successfully');
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
        console.error("❌ Create/update patient profile error:", error);
        console.error("❌ Error details:", {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(err => err.message);
            console.log("❌ Validation errors:", messages);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: messages
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Server error saving patient profile",
            error: error.message
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

