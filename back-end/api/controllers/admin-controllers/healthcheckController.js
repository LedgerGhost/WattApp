const { points } = require("../../utils/database");

exports.healthcheck = async (req, res) => {
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
            throw new Error("Database connection failed");
        }

        // CALCULATE STATISTICS 
        // Online := available, charging, reserved, malfunction.
        // Offline := offline.
        const totalPoints = points.length;
        const offlinePoints = points.filter(p => p.status === 'offline').length;
        const onlinePoints = totalPoints - offlinePoints;

        // RETURN SUCCESS (200 OK)
        return res.status(200).json({
            status: "OK",
            dbconnection: "mongodb://localhost:27017/softeng25-37", // Ενδεικτικό string σύνδεσης
            n_charge_points: totalPoints,
            n_charge_points_online: onlinePoints,
            n_charge_points_offline: offlinePoints
        });

    } catch (error) {
        // HANDLE CONNECTION ERRORS (400 Bad Request) 
        console.error("Healthcheck Error:", error);
        
        return res.status(400).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Database Connection Failed",
            debuginfo: error.message
        });
    }
};