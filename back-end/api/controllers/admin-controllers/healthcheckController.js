const mongoose = require('mongoose');
const Point = require('../../../../models/Point'); 

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
        // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        if (mongoose.connection.readyState !== 1) {
            throw new Error("Database connection is not established");
        }

        // GET STATISTICS (Using your Model's helper function)
        const stats = await Point.getPointCounts();

        // CONSTRUCT CONNECTION STRING
        // We build this dynamically from the active connection. 
        // This is safer than reading the .env file because it doesn't expose passwords.
        const dbHost = mongoose.connection.host;
        const dbPort = mongoose.connection.port;
        const dbName = mongoose.connection.name;
        const connectionString = `mongodb://${dbHost}:${dbPort}/${dbName}`;

        // 5. RETURN SUCCESS (200 OK)
        return res.status(200).json({
            status: "OK",
            dbconnection: connectionString,
            n_charge_points: stats.total,
            n_charge_points_online: stats.online,
            n_charge_points_offline: stats.offline
        });

    } catch (error) {
        // HANDLE ERRORS
        console.error("Healthcheck Error:", error);
        
        return res.status(400).json({ // Exercise asks for 400 on failure
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Healthcheck failed",
            debuginfo: error.message
        });
    }
};