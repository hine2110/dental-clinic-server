const Discount = require('../models/Discount.js');

const createDiscount = async (req, res) => {
  try {
    const { code, startDate, endDate } = req.body;
    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'Start date and end date are required.'
        });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    if (new Date(startDate) < today) {
      return res.status(400).json({ // 400 Bad Request
        success: false,
        message: 'Start date cannot be in the past.'
      });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be on or after the start date.'
      });
    }
    const existingDiscount = await Discount.findOne({ code: code.toUpperCase() });
    if (existingDiscount) {
      return res.status(409).json({ success: false, message: `Discount code '${code}' already exists.` });
    }
    const newDiscount = new Discount(req.body);
    const savedDiscount = await newDiscount.save();
    res.status(201).json({ success: true, message: 'Discount created successfully!', data: savedDiscount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create discount.', error: error.message });
  }
};

const updateDiscount = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (startDate || endDate) {
        const currentDiscount = await Discount.findById(req.params.id);
        if (!currentDiscount) {
            return res.status(404).json({ success: false, message: 'Discount not found.' });
        }
        
        const finalStartDate = startDate ? new Date(startDate) : currentDiscount.startDate;
        const finalEndDate = endDate ? new Date(endDate) : currentDiscount.endDate;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (finalStartDate < today) {
            return res.status(400).json({
                success: false,
                message: 'Start date cannot be in the past.'
            });
        }
        if (finalEndDate < finalStartDate) {
            return res.status(400).json({
                success: false,
                message: 'End date must be on or after the start date.'
            });
        }
    }

    const updatedDiscount = await Discount.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedDiscount) {
      return res.status(404).json({ success: false, message: 'Discount not found.' });
    }
    res.status(200).json({ success: true, message: 'Discount updated successfully!', data: updatedDiscount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update discount.', error: error.message });
  }
};

const getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find({});
    res.status(200).json({ success: true, data: discounts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch discounts.', error: error.message });
  }
};

const getDiscountById = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      return res.status(404).json({ success: false, message: 'Discount not found.' });
    }
    res.status(200).json({ success: true, data: discount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch discount.', error: error.message });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const deletedDiscount = await Discount.findByIdAndDelete(req.params.id);
    if (!deletedDiscount) {
      return res.status(404).json({ success: false, message: 'Discount not found.' });
    }
    res.status(200).json({ success: true, message: 'Discount deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete discount.', error: error.message });
  }
};

const checkDiscountCodeExists = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ exists: false, message: 'Discount code is required.' });
    }
    const existingDiscount = await Discount.findOne({ code: code.toUpperCase() });
    
    if (existingDiscount) {
      return res.status(200).json({ exists: true });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error while checking code.', error: error.message });
  }
};

const applyDiscount = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá.' });
    }

    const discount = await Discount.findOne({ code: code.toUpperCase() });

    if (!discount) {
      return res.status(404).json({ success: false, message: 'Mã giảm giá không hợp lệ.' });
    }

    if (!discount.isActive) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã bị vô hiệu hoá.' });
    }

    const today = new Date();
    if (today < discount.startDate) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá chưa đến ngày sử dụng.' });
    }
    if (today > discount.endDate) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn.' });
    }
    if (discount.maxUsage != null && discount.usageCount >= discount.maxUsage) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng.' });
    }
    res.status(200).json({ success: true, message: 'Áp dụng mã thành công!', data: discount });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi kiểm tra mã.', error: error.message });
  }
};


module.exports = {
  createDiscount,
  getAllDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
  checkDiscountCodeExists,
  applyDiscount,
};