// c

const { points } = require("../utils/database");
const { formatLocalTimestamp } = require("../utils/time");
const { buildErrorLog } = require("../utils/errorLog");

// POST /reserve/:id(/:minutes)
exports.reservePoint = (req, res) => {
  try {
    const id = req.params.id;

    // default 30'
    let minutes = req.params.minutes !== undefined ? parseInt(req.params.minutes, 10) : 30;

    // Validate minutes (400)
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          "Invalid minutes parameter",
          `minutes: ${req.params.minutes}`
        )
      );
    }

    // Max limit 60'
    minutes = Math.min(minutes, 60);

    const point = points.find(p => p.pointid == id);

    // 404 + error log
    if (!point) {
      return res.status(404).json(
        buildErrorLog(
          req,
          404,
          `Point with id ${id} not found`,
          "Check if pointid exists"
        )
      );
    }

    // Must be available to reserve
    // Spec: returns epoch time when reservation fails
    if (point.status !== "available") {
      return res.status(400).json({
        pointid: String(id),              // αν θες strict string, αλλιώς αφαίρεσέ το
        status: point.status,
        reservationendtime: "1970-01-01 00:00"
      });
    }

    // Change status
    point.status = "reserved";

    // Calculate end time (YYYY-MM-DD hh:mm)
    const endDate = new Date(Date.now() + minutes * 60 * 1000);
    const end = formatLocalTimestamp(endDate);

    // store for /point/:id
    point.reservationendtime = end;

    return res.status(200).json({
      pointid: point.pointid,
      status: "reserved",
      reservationendtime: end
    });

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
