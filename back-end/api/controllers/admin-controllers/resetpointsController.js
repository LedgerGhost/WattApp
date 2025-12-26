const { points } = require("../../utils/database"); // Import the mock DB array
const fs = require('fs').promises; // Use Node.js File System with Promises
const path = require('path');

// --- HARDWIRED CONSTANT PATH  ---
// We assume the file is located at: project_root/data/points_data.json
// This path is fixed (hardwired) as required.
const SOURCE_FILE_PATH = path.join(__dirname, '../../utils/mockinitializationdata.json');

// ????????????????????????????????????????????????????????????????????????


exports.resetPoints = async (req, res) => {
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

        // DB CONNECTION CHECK 
        // Στην προσομοίωση (mock data), ελέγχουμε απλά αν φορτώθηκε ο πίνακας points.
        // Σε πραγματική ΒΔ, εδώ θα γινόταν π.χ. mongoose.connection.readyState
        if (!points) {
            return res.status(400).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Database Connection Failed",
            debuginfo: error.message
        });
        }

        // READ INITIALIZATION DATA FROM THE FILE 
        // "προβαίνει σε αρχικοποίηση... με τις τιμές που περιέχονται στο αρχείο json"
        // We read the file asynchronously.
        const fileData = await fs.readFile(SOURCE_FILE_PATH, 'utf8');
        const newPointsData = JSON.parse(fileData);

        // VALIDATE DATA 
        if (!Array.isArray(newPointsData)) {
            throw new Error("Invalid file format: Root element must be an array of points.");
        }

        // --- 3. RESET THE MOCK DB ---
        // Since 'points' is an imported array reference, we cannot simply say "points = []".
        // We must modify the array in place to ensure other controllers see the changes.
        points.length = 0; // Clears the array completely
        points.push(...newPointsData); // Inserts all new items

        // FOR DEBUGGING PURPOSES ONLY -- UNCOMMENT THE FOLLOWING 2 LINES IF NEEDED
        // console.log("\n CURRENT DATABASE SNAPSHOT:");
        // console.table(points);
        
        // RETURN SUCCESS (200 OK) 
        return res.status(200).json({
            status: "OK",
            message: "Points database initialized successfully",
            total_points: points.length
        });

    } catch (error) {
        // --- 5. HANDLE ERRORS ---
        // "διαφορετικά επιστρέφεται το αντίστοιχο αντικείμενο error log"
        console.error("ResetPoints Error:", error);

        return res.status(500).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 500,
            error: "Failed to reset points data",
            debuginfo: error.message // Will show "ENOENT" if file is missing, or JSON parse errors
        });
    }
};