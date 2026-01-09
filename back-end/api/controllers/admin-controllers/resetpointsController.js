const Point = require('../../../../models/Point'); // Adjust path as needed
const fs = require('fs');
const path = require('path');

// --- HELPER FUNCTION FOR DATES ---
// Handles both "2025-01-01" strings AND { "$date": "2025-01-01" } objects
const cleanDate = (dateValue) => {
    if (!dateValue) return null; // Handle null or undefined
    if (dateValue.$date) return new Date(dateValue.$date); // Handle MongoDB Extended JSON
    return new Date(dateValue); // Handle standard strings/dates
};

exports.resetPoints = async (req, res) => {
    try {
        // VALIDATE FORMAT
        const normalizedFormat = (req.query.format || 'json').toLowerCase();
        if (normalizedFormat !== 'json') {
            return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: `Invalid format '${req.query.format}'. Allowed values: json, csv`
            });
        }

        // READ THE FILE
        const filePath = path.join(__dirname, '../../utils/resetpointsdata.json');

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found at ${filePath}`);
        }
        const fileData = fs.readFileSync(filePath, 'utf8');
        const pointsArray = JSON.parse(fileData);

        // 🔍 DEBUG LOG: Check if data is actually being read
        console.log(`📂 Read file: ${filePath}`);
        console.log(`🔢 Items found in JSON: ${pointsArray.length}`);

        if (pointsArray.length === 0) {
            console.warn("⚠️ Warning: JSON file is empty array []");
        }

        // MAP & CLEAN DATA
        // We transform the JSON raw data to match the Mongoose Schema keys exactly.
        const cleanedPoints = pointsArray.map(p => ({
            pointid: parseInt((p.pointid), 10),
            external_station_id: p.external_station_id,
            station_name: p.station_name,
            lon: String(p.lon), // Location Data, Ensure string 
            lat: String(p.lat), // Location Data, Ensure string 
            status: p.status,
            cap: parseInt(p.cap),
            connector_type: p.connector_type,
            kwhprice: parseFloat(p.kwhprice),
            reservationendtime: cleanDate(p.reservationendtime),
            address: p.address,
            providerName: p.providerName,
            lastStatusChange: cleanDate(p.lastStatusChange),
            createdAt: cleanDate(p.created_at),
            updatedAt: cleanDate(p.updated_at)
        }));

        // PERFORM DATABASE RESET
        // Delete all existing documents
        await Point.deleteMany({});
        
        // Insert the cleaned data
        // ordered: false ensures that if one bad record fails, the others are still inserted
        const result = await Point.insertMany(cleanedPoints, { ordered: false });

        // RETURN SUCCESS
        return res.status(200).json({
            status: "OK",
            timeref: new Date().toISOString(),
            action: "Database reset successfully",
            source_file: "resetpointsdata.json",
            total_points_imported: result.length
        });

    } catch (error) {
        console.error("ResetPoints Error:", error);
        
        return res.status(500).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 500,
            error: "Failed to reset points",
            debuginfo: error.message
        });
    }
};