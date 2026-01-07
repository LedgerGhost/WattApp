require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 9876;

async function start() {
  try {
    if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in .env");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    console.log("DB name:", mongoose.connection.name);

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}!`));
  } catch (err) {
    console.error("❌ Failed to start:", err.message);
    process.exit(1);
  }
}

start();
