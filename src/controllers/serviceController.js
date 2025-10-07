const { Service } = require("../models");

// ==================== CREATE SERVICE ====================
const createService = async (req, res) => {
  try {
    const {
      name,
      thumbnail,
      description,
      category,
      price,
      duration,
      isActive,
      process,
    } = req.body;

    // Validate required fields
    if (!name || !category || !price) {
      return res.status(400).json({
        success: false,
        message: "Name, category, and price are required",
      });
    }

    // Check if service name already exists
    const existingService = await Service.findOne({ name });
    if (existingService) {
      return res.status(400).json({
        success: false,
        message: "Service with this name already exists",
      });
    }

    // Prepare service data - convert string values to appropriate types
    const serviceData = {
      name,
      thumbnail,
      description,
      category,
      price: parseFloat(price),
      duration: duration ? parseInt(duration) : undefined,
      isActive:
        isActive === "true" || isActive === true || isActive === undefined,
    };

    // Parse process if provided (JSON string or array)
    if (process) {
      try {
        const parsed = Array.isArray(process) ? process : JSON.parse(process);
        if (Array.isArray(parsed)) {
          serviceData.process = parsed
            .map((s, idx) => ({
              step: Number(s.step) || idx + 1,
              title: (s.title || "").trim(),
              description: (s.description || "").trim(),
            }))
            .filter((s) => s.title || s.description);
        }
      } catch (err) {
        // ignore parse error; server will still create service without process
      }
    }

    // Add image data if file was uploaded
    if (req.file) {
      serviceData.image = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
      };
    }

    // Create service
    const service = await Service.create(serviceData);

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service,
    });
  } catch (error) {
    console.error("Create service error:", error);

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
      message: "Server error creating service",
    });
  }
};

// ==================== GET ALL SERVICES ====================
const getAllServices = async (req, res) => {
  try {
    const {
      category,
      isActive,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    // Filter by category if specified
    if (category && category !== "all") {
      filter.category = category;
    }

    // Filter by active status if specified
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
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
        isActive: isActive || "all",
        search: search || "",
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Get all services error:", error);

    res.status(500).json({
      success: false,
      message: "Server error retrieving services",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ==================== GET SERVICE BY ID ====================
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
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

// ==================== UPDATE SERVICE ====================
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, duration, isActive, process } =
      req.body;

    // Check if service exists
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Check if new name conflicts with existing service (excluding current service)
    if (name && name !== service.name) {
      const existingService = await Service.findOne({
        name,
        _id: { $ne: id },
      });
      if (existingService) {
        return res.status(400).json({
          success: false,
          message: "Service with this name already exists",
        });
      }
    }

    // Prepare update data - convert string values to appropriate types
    const updateData = {};

    // Only update fields that are provided and validate required fields
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }
      updateData.name = name;
    }

    if (description !== undefined) updateData.description = description;

    if (category !== undefined) {
      if (!category.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be empty",
        });
      }
      updateData.category = category;
    }

    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid positive number",
        });
      }
      updateData.price = priceNum;
    }

    if (duration !== undefined)
      updateData.duration = duration ? parseInt(duration) : undefined;
    if (isActive !== undefined)
      updateData.isActive = isActive === "true" || isActive === true;

    // Update process if provided
    if (process !== undefined) {
      try {
        const parsed = Array.isArray(process) ? process : JSON.parse(process);
        if (Array.isArray(parsed)) {
          updateData.process = parsed
            .map((s, idx) => ({
              step: Number(s.step) || idx + 1,
              title: (s.title || "").trim(),
              description: (s.description || "").trim(),
            }))
            .filter((s) => s.title || s.description);
        }
      } catch (err) {
        // ignore parsing issue
      }
    }

    // Add image data if new file was uploaded
    if (req.file) {
      updateData.image = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
      };
    }

    // Manual validation for critical fields
    if (updateData.name && updateData.name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long",
      });
    }

    if (updateData.price && updateData.price < 0) {
      return res.status(400).json({
        success: false,
        message: "Price cannot be negative",
      });
    }

    // Update service - only run validators for provided fields
    const updatedService = await Service.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: false, // Disable validators to avoid process field validation
    });

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: updatedService,
    });
  } catch (error) {
    console.error("Update service error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      body: req.body,
      file: req.file,
    });

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
      message: "Server error updating service",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ==================== DELETE SERVICE ====================
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Soft delete - set isActive to false instead of hard delete
    await Service.findByIdAndUpdate(id, { isActive: false });

    res.status(200).json({
      success: true,
      message: "Service deactivated successfully",
    });
  } catch (error) {
    console.error("Delete service error:", error);

    res.status(500).json({
      success: false,
      message: "Server error deleting service",
    });
  }
};

// ==================== HARD DELETE SERVICE ====================
const hardDeleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Hard delete - permanently remove from database
    await Service.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Service permanently deleted",
    });
  } catch (error) {
    console.error("Hard delete service error:", error);

    res.status(500).json({
      success: false,
      message: "Server error deleting service",
    });
  }
};

// ==================== GET SERVICE CATEGORIES ====================
const getServiceCategories = async (req, res) => {
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

// ==================== TOGGLE SERVICE STATUS ====================
const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Toggle isActive status
    const updatedService = await Service.findByIdAndUpdate(
      id,
      { isActive: !service.isActive },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Service ${
        updatedService.isActive ? "activated" : "deactivated"
      } successfully`,
      data: updatedService,
    });
  } catch (error) {
    console.error("Toggle service status error:", error);

    res.status(500).json({
      success: false,
      message: "Server error toggling service status",
    });
  }
};

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
  hardDeleteService,
  getServiceCategories,
  toggleServiceStatus,
};
