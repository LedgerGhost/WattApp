require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("./models/User");

async function createTestUser() {
  try {
    if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI");
    
    await mongoose.connect(process.env.MONGO_URI, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log("✅ Connected to MongoDB");

    // Hash password
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create test user
    const user = new User({
      email: "test@example.com",
      password_hash: hashedPassword,
      first_name: "Test",
      last_name: "User",
      phone: "1234567890",
      role: "customer",
      status: "active",
      email_verified: true,
    });

    await user.save();
    console.log("✅ Test user created!");
    console.log("Email: test@example.com");
    console.log("Password: password123");
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

createTestUser();
