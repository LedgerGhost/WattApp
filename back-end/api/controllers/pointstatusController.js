// g. Μεταβολές κατάστασης σημείου
// GET /api/pointstatus/:pointid/:from/:to

const { points, pointStatusHistory } = require("../utils/database");
const { parseDateStartOfDay, parseDateEndOfDay, isValidDateRange, isDateInRange} = require("../utils/dateParser");

exports.getPointStatusHistory = (req, res) => {
    const pointid = req.params.pointid;
    const fromStr = req.params.from;  // format: YYYYMMDD
    const toStr = req.params.to;      // format: YYYYMMDD
    
    // Validate and normalize response format query parameter (default: json)
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
    const format = normalizedFormat;

    // Validate point exists
    const point = points.find(p => p.pointid == pointid);
    if (!point) {
        return res.status(404).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 404,
            error: `Point with id ${pointid} not found`,
            debuginfo: "Check if pointid exists in database"
        });
    }

    // Parse dates using utility functions (automatically sets time boundaries)
    const fromDate = parseDateStartOfDay(fromStr);  // Sets to 00:00:00.000
    const toDate = parseDateEndOfDay(toStr);        // Sets to 23:59:59.999
    
    // Validate date format
    if (!fromDate || !toDate) {
        return res.status(400).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Invalid date format. Expected YYYYMMDD",
            debuginfo: `from: ${fromStr}, to: ${toStr}`
        });
    }

    // Validate date range using utility function
    if (!isValidDateRange(fromDate, toDate)) {
        return res.status(400).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Invalid date range: 'from' date must be before or equal to 'to' date",
            debuginfo: `from: ${fromStr}, to: ${toStr}`
        });
    }

    // Filter status changes for this point within date range (inclusive)
    const filteredpointStatusHistory = pointStatusHistory
        // Check ID 
        .filter(change => change.pointid == pointid)
        
        // Prepare Data 
        .map(change => ({
            ...change, // Keep original data temporarily
            _parsedDate: new Date(change.timeref.replace(' ', 'T')) // Create helper field
        }))
        // Date Filter 
        .filter(change => isDateInRange(change._parsedDate, fromDate, toDate))
        // Ascending order (oldest first) ΙΣΩΣ ΘΕΛΕΙ ΦΘΙΝΟΥΣΑ ΣΕΙΡΑ??
        .sort((a, b) => a._parsedDate - b._parsedDate)
        // STRICTLY select only the 3 fields that were asked for.
        .map(change => ({
            timeref: change.timeref,      // String
            old_state: change.old_state,  // String
            new_state: change.new_state   // String
        }));

    // Handle empty results - return 204 No Content
    if (filteredpointStatusHistory.length === 0) {
        return res.status(204).send();
    }

    // Handle CSV Output
    if (format === 'csv') {
        const csvHeader = 'timeref,old_state,new_state\n';
        const csvRows = filteredpointStatusHistory
            .map(row => `"${row.timeref}","${row.old_state}","${row.new_state}"`)
            .join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        return res.send(csvHeader + csvRows);
    }

    // Default: JSON format
    return res.json(filteredpointStatusHistory);
};
