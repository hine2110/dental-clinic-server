
const validateEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: "Password is required" };
  }
  if (password.length < 6) {
    return { isValid: false, message: "Password must be at least 6 characters long" };
  }
  return { isValid: true, message: "Password is valid" };
};

const validatePhone = (phone) => {
  const phoneRegex = /^[0-9+\-\s()]+$/;
  return phoneRegex.test(phone);
};

const validateFullName = (fullName) => {
  if (!fullName || fullName.trim().length === 0) {
    return { isValid: false, message: "Full name is required" };
  }
  if (fullName.length > 100) {
    return { isValid: false, message: "Full name cannot exceed 100 characters" };
  }
  return { isValid: true, message: "Full name is valid" };
};

const validateRole = (role) => {
  const validRoles = ["admin", "doctor", "receptionist", "patient"];
  return validRoles.includes(role);
};

const validateUserRegistration = (userData) => {
  const errors = [];
  const { email, password, fullName, phone, role } = userData;

  // Validate email
  if (!email) {
    errors.push("Email is required");
  } else if (!validateEmail(email)) {
    errors.push("Please provide a valid email address");
  }

  // Validate password (only if not Google user)
  if (!userData.googleId) {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.push(passwordValidation.message);
    }
  }

  // Validate full name
  const fullNameValidation = validateFullName(fullName);
  if (!fullNameValidation.isValid) {
    errors.push(fullNameValidation.message);
  }

  // Validate phone (only if not Google user)
  if (!userData.googleId) {
    if (!phone) {
      errors.push("Phone number is required");
    } else if (!validatePhone(phone)) {
      errors.push("Please provide a valid phone number");
    }
  }

  // Validate role
  if (!role) {
    errors.push("Role is required");
  } else if (!validateRole(role)) {
    errors.push("Invalid role specified");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

//validate patient profile
const validatePatientProfile = (profileData) => {
  const errors = [];
  const { basicInfo, contactInfo } = profileData;

  //validate basic info
  if (!basicInfo?.fullName) {
    errors.push("Full name is required");
  }
  
  if (!basicInfo?.dateOfBirth) {
    errors.push("Date of birth is required");
  }

  if (!basicInfo?.gender) {
    errors.push("Gender is required");
  }

  if (!basicInfo?.idCard?.frontImage) {
    errors.push("ID card front image is required");
  }

  if (!basicInfo?.idCard?.backImage) {
    errors.push("ID card back image is required");
  }

  //contact info
  if (!contactInfo?.phone) {
    errors.push("Phone number is required");
  }
  
  if (!contactInfo?.email) {
    errors.push("Email is required");
  }

  if (!contactInfo?.address?.city) {
    errors.push("City is required")
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateFullName,
  validateRole,
  validateUserRegistration,
  validatePatientProfile
};
