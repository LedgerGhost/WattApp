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
        email: "admin@example.com",
        fullName: "Admin User",
        password: "password123" // In real life, this must be hashed!
    },
    {
        id: 2,
        email: "john.doe@example.com",
        fullName: "John Doe",
        password: "pass456"
    },
    {
        id: 3,
        email: "jane.smith@example.com",
        fullName: "Jane Smith",
        password: "securePass1"
    },
    {
        id: 4,
        email: "alice.wonder@example.com",
        fullName: "Alice Wonder",
        password: "wonderland99"
    },
    {
        id: 5,
        email: "bob.builder@example.com",
        fullName: "Bob Builder",
        password: "canWeFixIt"
    },
    {
        id: 6,
        email: "charlie.brown@example.com",
        fullName: "Charlie Brown",
        password: "snoopy123"
    },
    {
        id: 7,
        email: "diana.prince@example.com",
        fullName: "Diana Prince",
        password: "wonderWoman"
    },
    {
        id: 8,
        email: "eve.online@example.com",
        fullName: "Eve Online",
        password: "spaceGame777"
    },
    {
        id: 9,
        email: "frank.castle@example.com",
        fullName: "Frank Castle",
        password: "punisher2024"
    },
    {
        id: 10,
        email: "grace.hopper@example.com",
        fullName: "Grace Hopper",
        password: "nanoseconds"
    },
    {
        id: 11,
        email: "henry.ford@example.com",
        fullName: "Henry Ford",
        password: "modelT1908"
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
