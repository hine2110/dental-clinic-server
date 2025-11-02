const mongoose = require('mongoose');
require('dotenv').config();

const Medicine = require('../src/models/Medicine');
const Location = require('../src/models/Location');

async function checkMedicines() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dental-clinic', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 1. Kiểm tra tổng số thuốc
    const totalMedicines = await Medicine.countDocuments();
    console.log(`\n📊 Tổng số thuốc trong database: ${totalMedicines}`);

    // 2. Kiểm tra thuốc có location field
    const medicinesWithLocation = await Medicine.countDocuments({ location: { $exists: true, $ne: null } });
    console.log(`📊 Số thuốc có location: ${medicinesWithLocation}`);

    // 3. Kiểm tra thuốc không có location
    const medicinesWithoutLocation = await Medicine.countDocuments({ 
      $or: [
        { location: { $exists: false } },
        { location: null }
      ]
    });
    console.log(`⚠️  Số thuốc KHÔNG có location: ${medicinesWithoutLocation}`);

    // 4. Kiểm tra tất cả locations có trong database
    const locations = await Location.find().select('_id name');
    console.log(`\n📍 Danh sách locations trong database:`);
    locations.forEach(loc => {
      console.log(`  - ${loc.name} (ID: ${loc._id})`);
    });

    // 5. Đếm thuốc theo từng location
    if (locations.length > 0) {
      console.log(`\n📦 Số thuốc theo từng location:`);
      for (const loc of locations) {
        const count = await Medicine.countDocuments({ 
          location: loc._id,
          isActive: true 
        });
        const totalCount = await Medicine.countDocuments({ location: loc._id });
        console.log(`  - ${loc.name}: ${count} active / ${totalCount} total`);
      }
    }

    // 6. Hiển thị mẫu thuốc (5 thuốc đầu tiên)
    console.log(`\n💊 Mẫu dữ liệu thuốc (5 thuốc đầu tiên):`);
    const sampleMedicines = await Medicine.find()
      .limit(5)
      .populate('location', 'name')
      .select('medicineId name location isActive');
    
    sampleMedicines.forEach((med, index) => {
      console.log(`\n  ${index + 1}. ${med.name} (ID: ${med.medicineId || med._id})`);
      console.log(`     Location: ${med.location ? med.location.name : '❌ KHÔNG CÓ'}`);
      console.log(`     Location ID: ${med.location ? med.location._id : 'null'}`);
      console.log(`     isActive: ${med.isActive}`);
    });

    // 7. Nếu có thuốc không có location, hiển thị danh sách
    if (medicinesWithoutLocation > 0) {
      console.log(`\n⚠️  Danh sách thuốc KHÔNG có location:`);
      const medicinesWithoutLoc = await Medicine.find({
        $or: [
          { location: { $exists: false } },
          { location: null }
        ]
      }).limit(10).select('medicineId name isActive');
      
      medicinesWithoutLoc.forEach((med, index) => {
        console.log(`  ${index + 1}. ${med.name} (ID: ${med.medicineId || med._id}) - Active: ${med.isActive}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMedicines();

