const { ServiceDoctor } = require("../models"); // Giả sử bạn export model như vậy

// ==================== CREATE SERVICE DOCTOR ====================
const createServiceDoctor = async (req, res) => {
  try {
    const { serviceName, price, isActive } = req.body;

    // 1. Validate required fields
    if (!serviceName || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "serviceName and price are required",
      });
    }

    // 2. Check if service name already exists
    const existingService = await ServiceDoctor.findOne({ serviceName });
    if (existingService) {
      return res.status(400).json({
        success: false,
        message: "Service with this name already exists",
      });
    }

    // 3. Prepare data
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number",
      });
    }

    const serviceData = {
      serviceName,
      price: priceNum,
      // Chỉ định isActive nếu nó được cung cấp, ngược lại Mongoose sẽ dùng default 'true'
      ...(isActive !== undefined && {
        isActive: isActive === "true" || isActive === true,
      }),
    };

    // 4. Create service
    const serviceDoctor = await ServiceDoctor.create(serviceData);

    res.status(201).json({
      success: true,
      message: "ServiceDoctor created successfully",
      data: serviceDoctor,
    });
  } catch (error) {
    console.error("Create ServiceDoctor error:", error);

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
      message: "Server error creating ServiceDoctor",
    });
  }
};

// ==================== GET ALL SERVICE DOCTORS ====================
const getAllServiceDoctors = async (req, res) => {
  try {
    const {
      isActive,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};

    // Filter by isActive
    if (
      isActive !== undefined &&
      isActive !== "all" &&
      isActive !== "undefined"
    ) {
      filter.isActive = isActive === "true";
    }

    // Filter by search (chỉ tìm theo serviceName)
    if (search) {
      filter.serviceName = { $regex: search, $options: "i" };
    }

    // Pagination
    const usePagination = limit !== "all" && parseInt(limit) > 0;
    const limitNum = usePagination ? parseInt(limit) : 0;
    const skip = usePagination ? (parseInt(page) - 1) * limitNum : 0;

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
    const services = await ServiceDoctor.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(); // .lean() để truy vấn nhanh hơn

    const totalServices = await ServiceDoctor.countDocuments(filter);

    const totalPages = usePagination ? Math.ceil(totalServices / limitNum) : 1;
    const currentPageNum = parseInt(page);

    res.status(200).json({
      success: true,
      message: "ServiceDoctors retrieved successfully",
      data: services,
      pagination: {
        currentPage: currentPageNum,
        totalPages: totalPages,
        totalServices: totalServices,
        hasNextPage: usePagination ? currentPageNum < totalPages : false,
        hasPrevPage: usePagination ? currentPageNum > 1 : false,
        limit: usePagination ? limitNum : totalServices,
      },
      filters: {
        isActive:
          isActive !== undefined && isActive !== "all"
            ? isActive === "true"
            : "all",
        search: search || "",
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Get all ServiceDoctors error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving ServiceDoctors",
      error: error.message,
    });
  }
};

// ==================== GET SERVICE DOCTOR BY ID ====================
const getServiceDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await ServiceDoctor.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "ServiceDoctor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "ServiceDoctor retrieved successfully",
      data: service,
    });
  } catch (error) {
    console.error("Get ServiceDoctor by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving ServiceDoctor",
    });
  }
};

// ==================== UPDATE SERVICE DOCTOR ====================
const updateServiceDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceName, price, isActive } = req.body;

    // 1. Check if service exists
    const service = await ServiceDoctor.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "ServiceDoctor not found",
      });
    }

    // 2. Check if new name conflicts
    if (serviceName && serviceName !== service.serviceName) {
      const existingService = await ServiceDoctor.findOne({
        serviceName,
        _id: { $ne: id },
      });
      if (existingService) {
        return res.status(400).json({
          success: false,
          message: "Service with this name already exists",
        });
      }
    }

    // 3. Prepare update data
    const updateData = {};
    if (serviceName !== undefined) updateData.serviceName = serviceName;
    if (isActive !== undefined)
      updateData.isActive = isActive === "true" || isActive === true;

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

    // 4. Update service
    const updatedService = await ServiceDoctor.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true, // Chạy validators của Mongoose (ví dụ: min: 0 cho price)
      }
    );

    res.status(200).json({
      success: true,
      message: "ServiceDoctor updated successfully",
      data: updatedService,
    });
  } catch (error) {
    console.error("Update ServiceDoctor error:", error);

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
      message: "Server error updating ServiceDoctor",
    });
  }
};

// ==================== DELETE SERVICE DOCTOR (SOFT DELETE) ====================
const deleteServiceDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await ServiceDoctor.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "ServiceDoctor not found",
      });
    }

    // Soft delete - chỉ cập nhật isActive
    await ServiceDoctor.findByIdAndUpdate(id, { isActive: false });

    res.status(200).json({
      success: true,
      message: "ServiceDoctor deactivated successfully",
    });
  } catch (error) {
    console.error("Delete ServiceDoctor error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deactivating ServiceDoctor",
    });
  }
};

// ==================== HARD DELETE SERVICE DOCTOR ====================
const hardDeleteServiceDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await ServiceDoctor.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "ServiceDoctor not found",
      });
    }

    // Hard delete - xoá vĩnh viễn
    await ServiceDoctor.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "ServiceDoctor permanently deleted",
    });
  } catch (error) {
    console.error("Hard delete ServiceDoctor error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting ServiceDoctor",
    });
  }
};

// ==================== TOGGLE SERVICE DOCTOR STATUS ====================
const toggleServiceDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await ServiceDoctor.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "ServiceDoctor not found",
      });
    }

    const updatedService = await ServiceDoctor.findByIdAndUpdate(
      id,
      { isActive: !service.isActive },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `ServiceDoctor ${
        updatedService.isActive ? "activated" : "deactivated"
      } successfully`,
      data: updatedService,
    });
  } catch (error) {
    console.error("Toggle ServiceDoctor status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error toggling ServiceDoctor status",
    });
  }
};

module.exports = {
  createServiceDoctor,
  getAllServiceDoctors,
  getServiceDoctorById,
  updateServiceDoctor,
  deleteServiceDoctor,
  hardDeleteServiceDoctor,
  toggleServiceDoctorStatus,
};