const { points } = require("../utils/database");

exports.navigateToPoint = (req, res) => {
    const pointId = Number(req.params.pointId);

    const point = points.find(p => p.pointid === pointId);

    if (!point) {
        return res.status(404).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 404,
            error: `Point with id ${pointId} not found`,
            debuginfo: "Invalid pointId"
        });
    }

    const { lat, lon } = point;

    // Google Maps navigation URL
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

    return res.redirect(mapsUrl);
};
