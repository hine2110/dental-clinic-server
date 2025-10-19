const Discount = require('../models/Discount.js');
const createDiscount = async (req, res) => {
  try {
    const { code } = req.body;
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
const updateDiscount = async (req, res) => {
  try {
    const updatedDiscount = await Discount.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // new: true trả về document đã cập nhật
    );
    if (!updatedDiscount) {
      return res.status(404).json({ success: false, message: 'Discount not found.' });
    }
    res.status(200).json({ success: true, message: 'Discount updated successfully!', data: updatedDiscount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update discount.', error: error.message });
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
// daodaosdasd
//dasdjasd 
//doasidoasd
//adasijdjsad
// dasdas 
//dasdasdasd
//ddadasd 

module.exports = {
  createDiscount,
  getAllDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
};