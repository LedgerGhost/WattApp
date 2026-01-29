//navigate to charger 
const { points } = require("../utils/database");
const { buildErrorLog } = require("../utils/errorLog");

exports.navigateToPoint = (req, res) => {
  try {
    const pointId = Number(req.params.pointId);

    // basic validation (optional αλλά χρήσιμο)
    if (!Number.isFinite(pointId)) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid pointId", "pointId must be a number")
      );
    }

    const point = points.find(p => p.pointid === pointId);

    if (!point) {
      return res.status(404).json(
        buildErrorLog(
          req,
          404,
          `Point with id ${pointId} not found`,
          "Invalid pointId"
        )
      );
    }

    const { lat, lon } = point;

    // Google Maps navigation URL
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

    return res.redirect(mapsUrl);

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
