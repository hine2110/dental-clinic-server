// Validation utilities for user input

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
const validateEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password 
 * @returns {object} { isValid: boolean, message: string }
 */
const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: "Password is required" };
  }
  if (password.length < 6) {
    return { isValid: false, message: "Password must be at least 6 characters long" };
  }
  return { isValid: true, message: "Password is valid" };
};

/**
 * Validate phone number format
 * @param {string} phone 
 * @returns {boolean}
 */
const validatePhone = (phone) => {
  const phoneRegex = /^[0-9+\-\s()]+$/;
  return phoneRegex.test(phone);
};

/**
 * Validate full name
 * @param {string} fullName 
 * @returns {object} { isValid: boolean, message: string }
 */
const validateFullName = (fullName) => {
  if (!fullName || fullName.trim().length === 0) {
    return { isValid: false, message: "Full name is required" };
  }
  if (fullName.length > 100) {
    return { isValid: false, message: "Full name cannot exceed 100 characters" };
  }
  return { isValid: true, message: "Full name is valid" };
};

/**
 * Validate user role
 * @param {string} role 
 * @returns {boolean}
 */
const validateRole = (role) => {
  const validRoles = ["admin", "doctor", "receptionist", "patient"];
  return validRoles.includes(role);
};

/**
 * Validate user registration data
 * @param {object} userData 
 * @returns {object} { isValid: boolean, errors: array }
 */
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

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateFullName,
  validateRole,
  validateUserRegistration
};
