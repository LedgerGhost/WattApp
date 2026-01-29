// FILE: back-end/api/manual-test/manualtest_adminController.js
// PURPOSE: A simple manual test for the adminController's healthcheck function.
// Using mock database data defined in ../utils/database.js

// 1. IMPORT YOUR CONTROLLER
// Make sure this filename matches exactly what you have in your folder!
const controller = require('../controllers/admin-controllers/healthcheckController');

// 2. DEFINE THE TEST INPUT (The Fake Request)
// Healthcheck is a simple GET, so we don't need params like :id or :from
const fakeReq = {
    params: {},     // No path parameters needed for healthcheck
    query: {},      // No query parameters needed
    
    // These are used by your error handler (in case something goes wrong)
    originalUrl: '/admin/healthcheck',
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
        console.log("\n📄 TEXT RESPONSE RECEIVED:");
        console.log(text);
    },
    
    // This runs if your controller sets a header
    setHeader: function(key, val) {
        console.log(`   [Header Set]: ${key} = ${val}`);
    }
};

// 4. EXECUTE THE TEST
console.log("🚀 STARTING MANUAL TEST: Healthcheck...");
console.log("------------------------------------------------");

// Since your controller is likely 'async', we can handle it here if we want strict timing,
// but for a simple manual test, calling it directly works fine.
try {
    // We manually push the button!
    controller.healthcheck(fakeReq, fakeRes);
} catch (error) {
    console.error("❌ CRASHED:", error);
}