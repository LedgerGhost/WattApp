// FILE: manualtest_pointstatusController.js
// PURPOSE: A simple manual test for the pointstatusController's getPointStatusHistory function.
// Using mock database data defined in ./utilsdatabase.js

// 1. IMPORT YOUR CONTROLLER
// Make sure this filename matches exactly what you have in your folder!
const controller = require('../controllers/pointstatusController');

// 2. DEFINE THE TEST INPUT (The Fake Request)
// We simulate a user asking for Point 1, from Jan 1st to Jan 5th
const fakeReq = {
    params: {
        pointid: 1,       // The ID we want
        from: '20240101', // Start Date
        to: '20240103'    // End Date
    },
    query: {
        format: 'json'    // Try changing this to 'csv' later to test that too!
    },
    // These are just extra fields usually present in a real request
    originalUrl: '/test/url',
    ip: '127.0.0.1'
};

// 3. DEFINE THE TEST OUTPUT (The Fake Response)
// We need to capture what the controller tries to send back.
const fakeRes = {
    // This runs if your controller calls res.status(...)
    status: function(code) {
        console.log(`\n STATUS CODE: ${code}`);
        // We return 'this' so we can chain commands like .status(200).json(...)
        return this; 
    },
    
    // This runs if your controller calls res.json(...)
    json: function(data) {
        console.log("\n📦 JSON RESPONSE RECEIVED:");
        console.log(JSON.stringify(data, null, 2)); // Pretty print the JSON
    },
    
    // This runs if your controller calls res.send(...)
    send: function(text) {
        console.log("\n📄 TEXT/CSV RESPONSE RECEIVED:");
        console.log(text);
    },
    
    // This runs if your controller sets a header
    setHeader: function(key, val) {
        console.log(`   [Header Set]: ${key} = ${val}`);
    }
};

// 4. EXECUTE THE TEST
console.log("🚀 STARTING MANUAL TEST...");
console.log("------------------------------------------------");

try {
    // We manually push the button!
    controller.getPointStatusHistory(fakeReq, fakeRes);
} catch (error) {
    console.error("❌ CRASHED:", error);
}