/* this is for mysql
const mysql = require('mysql2');

 //create connection and export it 
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB,
});

module.exports = { pool }; 
*/

const sessions = [];
const reservations=[];

const pointStatusHistory = [
    // --- DATA FOR POINT 1 (The one we will test) ---
    // Case A: Early date (Jan 1st)
    { pointid: 1, timeref: "2024-01-01 10:00:00", old_state: "available", new_state: "reserved" },
    // Case B: Middle date (Jan 2nd)
    { pointid: 1, timeref: "2024-01-02 14:30:00", old_state: "reserved", new_state: "charging" },
    // Case C: Late date (Jan 5th)
    { pointid: 1, timeref: "2024-01-05 09:15:00", old_state: "charging", new_state: "available" },

    // --- DATA FOR POINT 2 (Noise) ---
    // This ensures your filter correctly ignores other points
    { pointid: 2, timeref: "2024-01-02 12:00:00", old_state: "available", new_state: "offline" }
];

let users = [
    // Optional: Add a default admin user for testing
    {
        id: 1,
        username: "admin",
        password: "password123" // In real life, this must be hashed!
    }
];

module.exports = {
  points: [
    { pointid: 1, lon:"23.73", lat:"37.98", status:"available", cap:50 },
    { pointid: 2, lon:"23.72", lat:"37.97", status:"charging",  cap:22 },
    { pointid: 3, lon:"23.71", lat:"37.96", status:"reserved",  cap:11 }
  ], 
  sessions,
  reservations,
  pointStatusHistory,
  users
};
