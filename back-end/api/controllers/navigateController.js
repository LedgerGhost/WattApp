//navigate to charger 
const Point = require("../../../models/Point");   
const { buildErrorLog } = require("../utils/errorLog");

exports.navigateToPoint = async (req, res) => {
  try {
    const pointId = Number(req.params.pointId);

    if (!Number.isFinite(pointId)) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid pointId", "pointId must be a number")
      );
    }

    
    const point = await Point.findOne({ pointid: pointId }).lean();

    if (!point) {
      return res.status(400).json(
        buildErrorLog(req, 400, `Point with id ${pointId} not found`, "Invalid pointId")
      );
    }

    const { lat, lon } = point;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

    return res.redirect(mapsUrl);

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
