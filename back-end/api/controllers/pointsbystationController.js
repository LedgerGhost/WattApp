const Point = require("../../../models/Point");
const { buildErrorLog } = require("../utils/errorLog");

exports.getPointsByRadius = async (req, res) => {
  try {
    const { lon, lat, radius } = req.params;

    // Validate Inputs
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    const maxDistMeters = radius ? parseFloat(radius) : 20000; // Default 1km

    if (isNaN(userLat) || isNaN(userLon)) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid coordinates", "lat and lon must be numbers")
      );
    }

    if (maxDistMeters <= 0) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid radius", "radius must be a positive number")
      );
    }

    // Aggregation Pipeline
    const groupedPoints = await Point.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [userLon, userLat] },
          distanceField: "dist.calculated", // Required field
          maxDistance: maxDistMeters,
          spherical: true,
          key: "location"
        }
      },
      {
            $group: {
                _id: { 
                    name: { $ifNull: ["$station_name", "Unknown Station"] }, 
                    coords: "$location.coordinates" 
                },

                points: { $push: "$pointid" },
                distance: { $min: "$dist.calculated" }
            }
      },
      {
        $sort: { distance: 1 } // Sort groups by nearest first
      }
    ]);

    // Transform to List Format
    const results = groupedPoints.map(group => {
        return {
            station_name: group._id.name,
            coordinates: {
                lat: group._id.coords[1], // Extract for clarity
                lon: group._id.coords[0]
            },
            points: group.points,
            // dist_from_user: Math.round(group.distance) // Optional: nice to have
        };
    });

    return res.status(200).json({
      cnt: groupedPoints.length, // Count of unique locations found
      radius: maxDistMeters,
      results: results
    });

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal Server Error", err.message)
    );
  }
};