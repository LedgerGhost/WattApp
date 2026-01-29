const mongoose = require('mongoose');

const checkDbConnection = (req, res, next) => {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoose.connection.readyState !== 1) {
        return res.status(400).json({ // Using 400 as per your requirement
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Database connection failed"
        });
    }
    // If connected, proceed to the next function (the actual endpoint)
    next();
};

module.exports = checkDbConnection;