// FILE: back-end/api/manual-test/manualtest_addpoints.js

// 1. IMPORTS
const controller = require('../controllers/admin-controllers/addpointsController');
const { points } = require('../utils/database'); 

// 2. HELPER: MOCK RESPONSE
const mockRes = {
    status: function(code) {
        console.log(`\n[ADD] STATUS CODE: ${code}`);
        return this;
    },
    json: function(data) {
        console.log("[ADD] JSON RESPONSE:");
        console.log(JSON.stringify(data, null, 2));
    },
    send: function(text) {
        console.log(`[ADD] TEXT: ${text}`);
    }
};

// 3. PREPARE FAKE CSV DATA
// Must match the columns of your JSON data exactly
const csvContent = `pointid,providerName,lon,lat,status,cap,kwhprice
999999,Tesla Supercharger,23.1234,38.5678,available,150,0.60
888888,Blink Charging,23.9876,38.4321,offline,22,0.35`;

// 4. EXECUTE TEST
const runTest = async () => {
    console.log("🚀 STARTING TEST: /admin/addpoints");
    console.log(`ℹ️  Initial DB Size: ${points.length}`);

    const req = {
        method: 'POST',
        originalUrl: '/admin/addpoints',
        ip: '127.0.0.1',
        // Important: We must specify json format to pass validation
        query: { format: 'json' }, 
        
        // SIMULATE MULTER FILE UPLOAD
        file: {
            fieldname: 'source',
            originalname: 'new_points.csv',
            encoding: '7bit',
            mimetype: 'text/csv',
            buffer: Buffer.from(csvContent, 'utf-8') // Create raw file data
        }
    };

    try {
        await controller.addPoints(req, mockRes);
        console.log(`✅ FINAL VERIFICATION: DB now has ${points.length} points.`);
        // Optional: Show the last added point
        const lastPoint = points[points.length - 1];
        if (lastPoint) {
            console.log("   Last Point Added:", lastPoint.providerName);
        }
    } catch (error) {
        console.error("❌ TEST FAILED:", error);
    }
};

runTest();