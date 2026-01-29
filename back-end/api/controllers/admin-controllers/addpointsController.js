const Point = require('../../../../models/Point'); // Import your Point Model
const { parse } = require('csv-parse/sync'); // Synchronous CSV parser

exports.addPoints = async (req, res) => {
    try {
        // CHECK IF FILE EXISTS
        // Multer puts the file in req.file.buffer
        if (!req.file) {
            return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: "No file uploaded. Expected multipart/form-data with mime type: 'text/csv'.",
                debuginfo: "Pls provide a CSV file in the 'file' field"
            });
        }

        // PARSE CSV DATA
        const fileContent = req.file.buffer.toString('utf8');
        let parsedData;
        
        try {
            parsedData = parse(fileContent, {
                columns: true, // Auto-detect headers (pointid, providerName, etc.)
                skip_empty_lines: false,
                trim: true,
                bom: true // Handles invisible BOM characters
            });
        } catch (parseError) {
            return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: "Failed to parse CSV file.",
                debuginfo: parseError.message
            });
        }

        // VALIDATION LOOP
        // We check every single row BEFORE we start preparing data for the DB.
        for (let i = 0; i < parsedData.length; i++) {
            const row = parsedData[i];
            const lineNumber = i + 2; // +1 for 0-index, +1 for Header row = +2
            const validationResult = Point.validateImportRow(row, lineNumber);
            if (validationResult) {
                return res.status(400).json({ // or 400
                    call: req.originalUrl,
                    timeref: new Date().toISOString(),
                    originator: req.ip,
                    return_code: 400,
                    error: validationResult.error,
                    debuginfo: validationResult.debuginfo
                });
            }
        }

        // TRANSFORM & MAP DATA TO SCHEMA
        const newPoints = parsedData.map(p => ({
            pointid: parseInt((p.pointid), 10),   
            // Map CSV headers to Schema fields
            station_name: p.station_name,
            lon: String(p.lon),
            lat: String(p.lat),
            status: p.status, 
            cap: parseInt(p.cap),
            connector_type: p.connector_type ? p.connector_type.trim() : undefined,
            kwhprice: parseFloat(p.kwhprice),
            reservationendtime: null,
            external_station_id: p.external_station_id ? p.external_station_id.trim() : undefined,
            address: p.address ? p.address.trim() : undefined,       
            providerName: p.providerName ? p.providerName.trim() : undefined
        }));

        // INSERT INTO DATABASE
        // ordered: false => If one point fails (e.g. duplicate), continue inserting the others.
        const result = await Point.insertMany(newPoints, { ordered: false });

        // RETURN SUCCESS (200 OK)
        return res.status(200).json({
            status: "OK",
            timeref: new Date().toISOString(),
            info: "New points added successfully",
            points_imported: result.length
        });

    } catch (error) {
        // HANDLE DUPLICATE KEY ERRORS (Code 11000)
        // If some points were added but others failed due to duplicates, we can still return 200/Partial
        if (error.code === 11000) {
            return res.status(200).json({
                status: "OK (Partial)",
                timeref: new Date().toISOString(),
                info: "Process completed, but some points were skipped (Duplicate IDs).",
                points_imported: error.result ? error.result.nInserted : "Unknown",
                debuginfo: "Duplicate pointid detected"
            });
        }

        // GENERIC SERVER ERROR
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