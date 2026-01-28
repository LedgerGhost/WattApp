const fs = require('fs');
const https = require('https');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const app = require('./app');

// Connect to the database before starting the server
const { connectDB } = require('../../config/database');

const PORT = process.env.PORT || 9876;

console.log("⏳ Initializing Database Connection...");

connectDB()
  .then(() => {
    //Start Server only after database connects
    const keyPath = path.resolve(__dirname, 'certs/localhost-key.pem');
const certPath = path.resolve(__dirname, 'certs/localhost.pem');

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`🚀 HTTPS server running at https://localhost:${PORT}!`);
  console.log(`✅ Database connected successfully`);
});

  })
  .catch((err) => {
    console.error("❌ Failed to connect to Database. Server shutting down.");
    console.error(err.message);
    process.exit(1);
  });