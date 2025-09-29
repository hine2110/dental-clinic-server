const { Service } = require("../models");

// ==================== GET PATIENT SERVICES ====================
const getPatientServices = async (req, res) => {
  try {
    const {
      category,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object - chỉ lấy services active
    const filter = { isActive: true };

    // Filter by category if specified
    if (category && category !== "all") {
      filter.category = category;
    }

    // Filter by search term (name or description)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get services with pagination and sorting
    let serviceQuery = Service.find(filter).sort(sortOptions);

    if (limit !== "all" && parseInt(limit) > 0) {
      serviceQuery = serviceQuery.skip(skip).limit(parseInt(limit));
    }

    const services = await serviceQuery;

    // Get total count for pagination
    const totalServices = await Service.countDocuments(filter);

    // Calculate pagination info
    const actualLimit = limit === "all" ? totalServices : parseInt(limit);
    const totalPages =
      limit === "all" ? 1 : Math.ceil(totalServices / parseInt(limit));
    const hasNextPage = limit === "all" ? false : parseInt(page) < totalPages;
    const hasPrevPage = limit === "all" ? false : parseInt(page) > 1;

    res.status(200).json({
      success: true,
      message: "Services retrieved successfully",
      data: services,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalServices,
        hasNextPage,
        hasPrevPage,
        limit: actualLimit,
      },
      filters: {
        category: category || "all",
        search: search || "",
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Get patient services error:", error);

    res.status(500).json({
      success: false,
      message: "Server error retrieving services",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ==================== GET SERVICE BY ID ====================
const getPatientServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findOne({ _id: id, isActive: true });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or inactive",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service retrieved successfully",
      data: service,
    });
  } catch (error) {
    console.error("Get service by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Server error retrieving service",
    });
  }
};

// ==================== GET SERVICE CATEGORIES ====================
const getPatientServiceCategories = async (req, res) => {
  try {
    const categories = await Service.distinct("category", { isActive: true });

    res.status(200).json({
      success: true,
      message: "Service categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Get service categories error:", error);

    res.status(500).json({
      success: false,
      message: "Server error retrieving service categories",
    });
  }
};

module.exports = {
  getPatientServices,
  getPatientServiceById,
  getPatientServiceCategories,
};
