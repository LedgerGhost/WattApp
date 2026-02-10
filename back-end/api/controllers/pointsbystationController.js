const Point = require("../../../models/Point");
const { buildErrorLog } = require("../utils/errorLog");

exports.getPointsByRadius = async (req, res) => {
  try {
    const { lon, lat, radius } = req.params;

    // Validate Inputs
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    if (isNaN(userLat) || isNaN(userLon)) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid coordinates", "lat and lon must be numbers")
      );
    }

    if (userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Coordinates out of range", "Latitude must be between -90 and 90. Longitude must be between -180 and 180."
        )
      );
    }

    let usedRadius = -1; // "Infinite" indicator for the response
    if (radius !== undefined && radius !== null) {
        const r = parseFloat(radius);
        if (!isNaN(r) && r > 0) {
            usedRadius = r;
        }
    }

    // Fetch Points
    const result = await Point.findNearbyStation(userLon, userLat, usedRadius);
    
    return res.status(200).json({
      cnt: result.count,
      radius: result.radius,
      results: result.data
    });

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal Server Error", err.message)
    );
  }
};