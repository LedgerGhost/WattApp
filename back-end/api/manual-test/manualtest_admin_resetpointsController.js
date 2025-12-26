// FILE: back-end/api/manual-test/manualtest_resetpointsController.js

// 1. IMPORTS
const controller = require('../controllers/admin-controllers/resetpointsController');
const { points } = require('../utils/database'); // To verify changes

// 2. HELPER: MOCK RESPONSE
const mockRes = {
    status: function(code) {
        console.log(`\n[RESET] STATUS CODE: ${code}`);
        return this;
    },
    json: function(data) {
        console.log("[RESET] JSON RESPONSE:");
        console.log(JSON.stringify(data, null, 2));
    },
    send: function(text) {
        console.log(`[RESET] TEXT: ${text}`);
    }
};

// 3. EXECUTE TEST
const runTest = async () => {
    console.log("🚀 STARTING TEST: /admin/resetpoints");
    console.log(`ℹ️  Initial DB Size: ${points.length}`);

    const req = {
        method: 'POST',
        originalUrl: '/admin/resetpoints',
        ip: '127.0.0.1',
        params: {},
        query: {} 
    };

    try {
        await controller.resetPoints(req, mockRes);
        console.log(`✅ FINAL VERIFICATION: DB now has ${points.length} points.`);
    } catch (error) {
        console.error("❌ TEST FAILED:", error);
    }
};

runTest();