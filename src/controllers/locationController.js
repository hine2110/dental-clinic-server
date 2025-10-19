const { Location } = require("../models");

const getActiveLocations = async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true }).select('name address');
    res.status(200).json({
      success: true,
      message: "Lấy danh sách cơ sở thành công",
      data: locations
    });
  } catch (error) {
    console.error("Get active locations error:", error);
    res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách cơ sở" });
  }
};

module.exports = { getActiveLocations };