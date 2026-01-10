const Point = require('../../../../models/Point'); // Import your Point Model
const { parse } = require('csv-parse/sync'); // Synchronous CSV parser

exports.addPoints = async (req, res) => {
    try {
        // VALIDATE FORMAT (400 Bad Request) - (default: json)
        const normalizedFormat = (req.query.format || 'json').toLowerCase();
        const allowedFormats = ['json', 'csv'];
        if (!allowedFormats.includes(normalizedFormat)) {
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
        // Multer puts the file in req.file.buffer
        if (!req.file) {
            return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: "No file uploaded. Expected multipart/form-data with field 'file'."
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
            throw new Error("Failed to parse CSV file. Ensure standard formatting.");
        }

        // VALIDATION LOOP
        // We check every single row BEFORE we start preparing data for the DB.
        for (let i = 0; i < parsedData.length; i++) {
            const row = parsedData[i];
            const lineNumber = i + 2; // +1 for 0-index, +1 for Header row = +2

            // Check Missing Point ID
            if (!row.pointid || String(row.pointid).trim() === '') {
                return res.status(500).json({
                    call: req.originalUrl,
                    timeref: new Date().toISOString(),
                    originator: req.ip,
                    return_code: 500,
                    error: `Validation Error on Line ${lineNumber}`,
                    debuginfo: `Row ${lineNumber} is missing 'pointid'. No points were added.`
                });
            }
            // Check Valid Point ID (is a number)
            if (isNaN(Number(row.pointid))) {
                return res.status(500).json({
                    call: req.originalUrl,
                    timeref: new Date().toISOString(),
                    originator: req.ip,
                    return_code: 500,
                    error: `Validation Error on Line ${lineNumber}`,
                    debuginfo: `Row ${lineNumber} has invalid pointid '${row.pointid}'. It must be a valid number.`
                });
            }
            // Check Missing Coordinates
            if (!row.lon || !row.lat || String(row.lon).trim() === '' || String(row.lat).trim() === '') {
                return res.status(500).json({
                    call: req.originalUrl,
                    timeref: new Date().toISOString(),
                    originator: req.ip,
                    return_code: 500,
                    error: `Validation Error on Line ${lineNumber}`,
                    debuginfo: `Row ${lineNumber} (Point ID: ${row.pointid}) is missing longitude or latitude. No points were added.`
                });
            
            }
            // Check if coordinates are valid numbers (Not NaN)
            if (isNaN(Number(row.lon)) || isNaN(Number(row.lat))) {
                return res.status(500).json({
                    call: req.originalUrl,
                    timeref: new Date().toISOString(),
                    originator: req.ip,
                    return_code: 500,
                    error: `Validation Error on Line ${lineNumber}`,
                    debuginfo: `Row ${lineNumber} contains non-numeric coordinates (Lon: '${row.lon}', Lat: '${row.lat}').`
                });
            }
            // Check Range (-180 to 180)
            if (Number(row.lon) < -180 || Number(row.lon) > 180 || Number(row.lat) < -180 || Number(row.lat) > 180) {
                 return res.status(500).json({
                    call: req.originalUrl,
                    timeref: new Date().toISOString(),
                    originator: req.ip,
                    return_code: 500,
                    error: `Validation Error on Line ${lineNumber}`,
                    debuginfo: `Row ${lineNumber} coordinates out of bounds. Must be between -180 and 180. (Got Lon: ${row.lon}, Lat: ${row.lat})`
                });
            }
        }

        // TRANSFORM & MAP DATA TO SCHEMA
        const newPoints = parsedData.map(p => ({
            pointid: parseInt((p.pointid), 10),
            
            // Map CSV headers to Schema fields
            external_stastion_id: p.external_stastion_id,
            station_name: p.station_name,
            lon: String(p.lon),
            lat: String(p.lat),
            status: p.status, 
            cap: parseInt(p.cap),
            connector_type: p.connector_type,
            kwhprice: parseFloat(p.kwhprice),
            reservationendtime: null,
            address: p.address,                
            providerName: p.providerName

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