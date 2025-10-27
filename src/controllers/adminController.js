const { User, Staff, Doctor, Admin, Management } = require("../models");

const createStaffAccount = async (req, res) => {
  try {
    const { email, role, firstName, lastName, phone, temporaryPassword } =
      req.body;

    // Basic validation for required core fields
    if (!email || !role || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: email, role, firstName, lastName are required",
      });
    }

    // Check if user has permission to create accounts (Admin only)
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Permission denied. Only admin can create staff accounts.",
      });
    }

    // Validate role - allow doctor, staff, management
    const allowedRoles = ["doctor", "staff", "management"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Allowed roles: doctor, staff, management",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Generate temporary password if not provided
    const plainPassword =
      temporaryPassword || `temp${Math.random().toString(36).slice(-8)}`;

    // Create user account
    const user = await User.create({
      email,
      password: plainPassword,
      role,
      fullName: `${firstName} ${lastName}`.trim(),
      phone,
    });

    // Create corresponding profile based on role
    if (role === "staff") {
      const { staffType } = req.body;
      const allowedStaffTypes = ["receptionist", "storeKepper"];
      if (!staffType || !allowedStaffTypes.includes(staffType)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid or missing staffType. Allowed: receptionist, storeKepper",
        });
      }
      const normalizedStaffType = staffType;

      // Sensible default permissions per staff type
      const receptionistDefaults = {
        acceptPatientBooking: true,
        processDeposit: true,
        sendNotifications: true,
        viewReceptionistSchedule: true,
        viewPatientInfo: true,
        editOwnProfile: true,
        // store keeper specific remain false by default
        viewStoreKepperSchedule: false,
        viewPrescriptions: false,
        dispenseMedicines: false,
        viewInventory: false,
        createMedicine: false,
        updateMedicine: false,
        deleteMedicine: false,
        viewEquipment: false,
        createEquipment: false,
        updateEquipment: false,
        deleteEquipment: false,
        reportEquipment: false,
        editOwnProfileStore: false,
      };

      const storeKeeperDefaults = {
        acceptPatientBooking: false,
        processDeposit: false,
        sendNotifications: false,
        viewReceptionistSchedule: false,
        viewPatientInfo: false,
        editOwnProfile: false,
        // store keeper focused
        viewStoreKepperSchedule: true,
        viewPrescriptions: true,
        dispenseMedicines: true,
        viewInventory: true,
        createMedicine: true,
        updateMedicine: true,
        deleteMedicine: false,
        viewEquipment: true,
        createEquipment: false,
        updateEquipment: true,
        deleteEquipment: false,
        reportEquipment: true,
        editOwnProfileStore: true,
      };

      const permissions =
        normalizedStaffType === "receptionist"
          ? receptionistDefaults
          : storeKeeperDefaults;

      await Staff.create({
        user: user._id,
        staffType: normalizedStaffType,
        permissions,
      });
    } else if (role === "doctor") {
      // Generate doctorId or use provided
      const providedDoctorId = req.body.doctorId;
      const doctorId =
        providedDoctorId ||
        `DOC${Date.now()}${Math.random().toString(36).slice(-4).toUpperCase()}`;

      // Create Doctor profile aligned with current schema
      await Doctor.create({
        doctorId,
        user: user._id,
        credentials: {
          medicalLicense: req.body.medicalLicense || "PENDING",
          dentalLicense: req.body.dentalLicense || "PENDING",
        },
        specializations:
          Array.isArray(req.body.specializations) &&
          req.body.specializations.length > 0
            ? req.body.specializations
            : ["General Dentistry"],
        isAcceptingNewPatients: true,
        isActive: true,
      });
    } else if (role === "management") {
      // Create Management profile with sensible defaults
      await Management.create({
        user: user._id,
        staffType: "management",
        permissions: {
          createDoctorSchedule: true,
          createReceptionistSchedule: true,
          createStoreKepperSchedule: true,
          viewDoctorProfile: true,
          viewStaffProfile: true,
          viewDoctorSchedule: true,
          viewStaffSchedule: true,
          updateDoctorSchedule: true,
          updateStaffSchedule: true,
          deleteDoctorSchedule: false,
          deleteStaffSchedule: false,
          viewEquipmentDamageReports: true,
          viewRevenueWeekly: true,
          viewRevenueMonthly: true,
          viewRevenueYearly: true,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
        },
        roleDetails:
          role === "staff"
            ? { staffType: req.body.staffType || "receptionist" }
            : role === "doctor"
            ? {
                doctorId: req.body.doctorId || "generated",
                medicalLicense: req.body.medicalLicense || "PENDING",
                dentalLicense: req.body.dentalLicense || "PENDING",
                specializations:
                  Array.isArray(req.body.specializations) &&
                  req.body.specializations.length > 0
                    ? req.body.specializations
                    : ["General Dentistry"],
              }
            : role === "management"
            ? { staffType: "management" }
            : {},
        temporaryPassword: plainPassword,
        note: "Please change password on first login",
      },
    });
  } catch (error) {
    console.error("Create account error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error creating account",
    });
  }
};

// Get all users with their profiles
const getAllUsers = async (req, res) => {
  try {
    // Check if user has admin permissions
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Permission denied. Only admin can view all users.",
      });
    }
    // Extract query parameters for filtering and pagination
    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    // Filter by role if specified
    if (role && role !== "all") {
      filter.role = role;
    }

    // Filter by active status if specified
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Filter by search term (name or email)
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get users with pagination and sorting
    // If limit is set to 'all' or 0, return all users
    let userQuery = User.find(filter)
      .select("-password") // Exclude password field
      .sort(sortOptions);

    if (limit !== "all" && parseInt(limit) > 0) {
      userQuery = userQuery.skip(skip).limit(parseInt(limit));
    }

    const users = await userQuery;

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);

    // Enhance user data with additional profile information
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();

        // Add profile-specific information based on role
        if (user.role === "doctor") {
          const doctorProfile = await Doctor.findOne({ user: user._id }).select(
            "doctorId specializations consultationFee license"
          );
          userObj.doctorProfile = doctorProfile;
        } else if (user.role === "staff") {
          const staffProfile = await Staff.findOne({ user: user._id }).select(
            "staffType permissions"
          );
          userObj.staffProfile = staffProfile;
        } else if (user.role === "admin") {
          const adminProfile = await Admin.findOne({ user: user._id }).select(
            "permissions"
          );
          userObj.adminProfile = adminProfile;
        }

        return userObj;
      })
    );

    // Calculate pagination info
    const actualLimit = limit === "all" ? totalUsers : parseInt(limit);
    const totalPages =
      limit === "all" ? 1 : Math.ceil(totalUsers / parseInt(limit));
    const hasNextPage = limit === "all" ? false : parseInt(page) < totalPages;
    const hasPrevPage = limit === "all" ? false : parseInt(page) > 1;

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: enhancedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNextPage,
        hasPrevPage,
        limit: actualLimit,
      },
      filters: {
        role: role || "all",
        isActive: isActive || "all",
        search: search || "",
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);

    res.status(500).json({
      success: false,
      message: "Server error retrieving users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Permission denied. Only admin can toggle user status.",
      });
    }
    const { id } = req.params; 
    const adminId = (req.user.id || req.user._id).toString();
    if (id === adminId) {
      return res.status(403).json({
        success: false,
        message: "Action denied. Admin cannot ban themselves.",
      });
    }
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: "Action denied. Cannot ban another admin account."
      });
    }
    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.isActive
        ? "User unbanned (activated)"
        : "User banned (deactivated)",
      data: { id: user._id, isActive: user.isActive },
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error toggling user status" });
  }
};

module.exports = {
  createStaffAccount,
  getAllUsers,
  toggleUserStatus,
};
