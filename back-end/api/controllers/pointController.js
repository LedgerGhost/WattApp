//b
const { points } = require("../utils/database");
const { formatLocalTimestamp } = require("../utils/time");
const { buildErrorLog } = require("../utils/errorLog");

// GET /api/point/:id
exports.getPointById = (req, res) => {
  try {
    const id = req.params.id;
    const point = points.find(p => p.pointid == id);

    if (!point) {
      return res.status(404).json(
        buildErrorLog(
          req,
          404,
          `Point with id ${id} not found`,
          "Check if id exists in mock DB"
        )
      );
    }

    return res.status(200).json({
      pointid: point.pointid,
      lon: point.lon,
      lat: point.lat,
      status: point.status,
      cap: point.cap,
      reservationendtime: point.reservationendtime
        ? point.reservationendtime
        : formatLocalTimestamp(),
      kwhprice: point.kwhprice !== undefined
        ? point.kwhprice
        : 0.50
    });

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(
        req,
        500,
        "Internal server error",
        err.message
      )
    );
  }
};
