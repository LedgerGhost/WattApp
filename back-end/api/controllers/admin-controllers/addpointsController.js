const { points } = require("../../utils/database");
const fs = require('fs'); // Standard file system
const { parse } = require('csv-parse/sync'); // Synchronous CSV parser for simplicity 
// need to install csv-parse --> npm install csv-parse 
const { info } = require("console");

exports.addPoints = async (req, res) => {
    try {
        // VALIDATE FORMAT (400 Bad Request) - (default: json)
        const normalizedFormat = (req.query.format || 'json').toLowerCase();
        if (normalizedFormat !== 'json') {
                return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: `Invalid format '${req.query.format}'. Allowed values: json, csv`,
                debuginfo: `format: ${req.query.format}`
            });
        }

        // CHECK IF FILE EXISTS 
        // In 'multipart/form-data', the file is usually available in req.file
        // (provided you use middleware like multer in the route)
        if (!req.file) {
            throw new Error("No file uploaded. Expected CSV file in 'file' field.");
        }

        // PARSE CSV DATA 
        // Read the file buffer/content
        const fileContent = req.file.buffer.toString('utf8');
        
        // Parse CSV to JSON. We assume the CSV headers match the JSON keys exactly.
        // columns: true => uses the first row as keys (pointid, providerName, etc.)
        const newPoints = parse(fileContent, {
            columns: true, 
            skip_empty_lines: true,
            trim: true
        });

        // VALIDATE DATA 
        // "The format... must strictly be the same as /admin/resetpoints" 
        // We verify that the new data has valid fields (e.g., pointid)
        if (newPoints.length > 0 && !newPoints[0].pointid) {
             throw new Error("Invalid CSV format. Missing 'pointid' column.");
        }

        // ADD TO DATABASE
        points.push(...newPoints);

        // FOR DEBUGGING PURPOSES ONLY -- UNCOMMENT THE FOLLOWING 2 LINES IF NEEDED
        // console.log("\n CURRENT DATABASE SNAPSHOT:");
        // console.table(points);

        // RETURN SUCCESS (200 OK) 
        // Returns 200 on success
        return res.status(200).json({
            status: "OK",
            timeref: new Date().toISOString(),
            info: "New points added successfully",
            points_added: newPoints.length,
            total_points: points.length
        });

    } catch (error) {
        console.error("AddPoints Error:", error);
        
        return res.status(500).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 500,
            error: "Failed to add points",
            debuginfo: error.message
        });
    }
};