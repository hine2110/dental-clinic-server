const mongoose = require('mongoose');
require('dotenv').config();

const Medicine = require('../src/models/Medicine');
const Location = require('../src/models/Location');

async function fixMedicinesLocation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dental-clinic');
    console.log('✅ Connected to MongoDB');

    // 1. Lấy location đầu tiên (hoặc location mặc định)
    const defaultLocation = await Location.findOne().select('_id name');
    
    if (!defaultLocation) {
      console.error('❌ Không tìm thấy location nào trong database!');
      console.log('⚠️  Vui lòng tạo ít nhất một location trước khi chạy script này.');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`\n📍 Sử dụng location mặc định: ${defaultLocation.name} (ID: ${defaultLocation._id})`);

    // 2. Tìm tất cả thuốc không có location
    const medicinesWithoutLocation = await Medicine.find({
      $or: [
        { location: { $exists: false } },
        { location: null }
      ]
    });

    console.log(`\n📦 Tìm thấy ${medicinesWithoutLocation.length} thuốc không có location`);

    if (medicinesWithoutLocation.length === 0) {
      console.log('✅ Tất cả thuốc đã có location. Không cần cập nhật.');
      await mongoose.disconnect();
      return;
    }

    // 3. Cập nhật từng thuốc
    let updatedCount = 0;
    let errorCount = 0;

    for (const medicine of medicinesWithoutLocation) {
      try {
        // Kiểm tra xem medicineId + location này đã tồn tại chưa (do unique index)
        const existing = await Medicine.findOne({
          medicineId: medicine.medicineId,
          location: defaultLocation._id
        });

        if (existing) {
          console.log(`⚠️  Thuốc ${medicine.name} (${medicine.medicineId}) đã tồn tại tại location này. Bỏ qua...`);
          continue;
        }

        medicine.location = defaultLocation._id;
        await medicine.save();
        updatedCount++;
        console.log(`✅ Đã cập nhật: ${medicine.name} (${medicine.medicineId})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Lỗi khi cập nhật ${medicine.name}:`, error.message);
      }
    }

    console.log(`\n📊 Kết quả:`);
    console.log(`  - Đã cập nhật: ${updatedCount} thuốc`);
    if (errorCount > 0) {
      console.log(`  - Lỗi: ${errorCount} thuốc`);
    }

    // 4. Kiểm tra lại
    const medicinesWithLocation = await Medicine.countDocuments({ 
      location: defaultLocation._id,
      isActive: true 
    });
    console.log(`\n✅ Số thuốc active tại location "${defaultLocation.name}": ${medicinesWithLocation}`);

    await mongoose.disconnect();
    console.log('\n✅ Hoàn thành! Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixMedicinesLocation();

