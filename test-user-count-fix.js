const axios = require("axios");

// Test script to verify user count is correct
const API_BASE_URL = "http://localhost:5000/api";

// Mock admin token (replace with real token)
const ADMIN_TOKEN = "your-admin-jwt-token-here";

const testUserCountFix = async () => {
  try {
    console.log("🧪 Testing User Count Fix...\n");

    // Test 1: Get users with default limit (should be 10)
    console.log("📋 Test 1: Default limit (limit=10)");
    const response1 = await axios.get(`${API_BASE_URL}/admin/users`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Default response:");
    console.log("📊 Total users in DB:", response1.data.pagination.totalUsers);
    console.log("👥 Users returned:", response1.data.data.length);
    console.log("🔢 Limit used:", response1.data.pagination.limit);
    console.log("");

    // Test 2: Get ALL users (limit=all)
    console.log("📋 Test 2: Get all users (limit=all)");
    const response2 = await axios.get(`${API_BASE_URL}/admin/users?limit=all`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ All users response:");
    console.log("📊 Total users in DB:", response2.data.pagination.totalUsers);
    console.log("👥 Users returned:", response2.data.data.length);
    console.log("🔢 Limit used:", response2.data.pagination.limit);
    console.log("");

    // Test 3: High limit to get all users
    console.log("📋 Test 3: High limit (limit=100)");
    const response3 = await axios.get(`${API_BASE_URL}/admin/users?limit=100`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ High limit response:");
    console.log("📊 Total users in DB:", response3.data.pagination.totalUsers);
    console.log("👥 Users returned:", response3.data.data.length);
    console.log("🔢 Limit used:", response3.data.pagination.limit);
    console.log("");

    // Verification
    const dbTotal = response2.data.pagination.totalUsers;
    const allUsersReturned = response2.data.data.length;

    console.log("🔍 VERIFICATION:");
    if (dbTotal === allUsersReturned) {
      console.log("✅ SUCCESS: API returns correct user count!");
      console.log(
        `🎉 Database total: ${dbTotal}, API returned: ${allUsersReturned}`
      );
    } else {
      console.log("❌ ISSUE: Count mismatch still exists");
      console.log(`📊 DB Total: ${dbTotal}`);
      console.log(`👥 API Returned: ${allUsersReturned}`);
    }

    // Role breakdown
    console.log("\n📈 Role breakdown:");
    const users = response2.data.data;
    const roleCount = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   ${role.toUpperCase()}: ${count}`);
    });

    console.log("\n💡 SOLUTION APPLIED:");
    console.log('1. ✅ Client now calls API with limit="all"');
    console.log("2. ✅ AdminService supports parameters");
    console.log('3. ✅ Backend supports limit="all" option');
    console.log("4. ✅ Dashboard will show correct total count");
  } catch (error) {
    console.error("❌ Test failed:");

    if (error.response) {
      console.error("📡 API Error:", error.response.status);
      console.error("💬 Message:", error.response.data.message);
    } else if (error.request) {
      console.error("🌐 Network Error: No response received");
      console.error("📋 Details:", error.message);
    } else {
      console.error("⚙️ Setup Error:", error.message);
    }
  }
};

console.log("🔧 User Count Issue Analysis:");
console.log("");
console.log(
  "🐛 PROBLEM: Dashboard shows Total Users = 10, but DB has 25 users"
);
console.log("");
console.log("🔍 ROOT CAUSE:");
console.log("   • API default limit = 10 (pagination)");
console.log("   • Client calls API without parameters");
console.log("   • Dashboard only shows first 10 users");
console.log("");
console.log("✅ SOLUTION:");
console.log('   • Client now calls: getAllUsers({ limit: "all" })');
console.log('   • API supports limit="all" to get all users');
console.log("   • Dashboard will show correct total count");
console.log("");

// Run the test if this script is executed directly
if (require.main === module) {
  if (ADMIN_TOKEN === "your-admin-jwt-token-here") {
    console.log(
      "⚠️  Please update ADMIN_TOKEN with a real JWT token before running tests"
    );
    console.log("");
    console.log("To get an admin token:");
    console.log("1. Start the server: npm start");
    console.log("2. Login as admin through the client");
    console.log("3. Copy the JWT token from localStorage");
    console.log("4. Replace ADMIN_TOKEN in this file");
    console.log("5. Run: node test-user-count-fix.js");
  } else {
    testUserCountFix();
  }
}

module.exports = { testUserCountFix };

