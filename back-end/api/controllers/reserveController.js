// c) POST /reserve/:id(/:minutes)

const Point = require("../../../models/Point");
const { buildErrorLog } = require("../utils/errorLog");

// Timestamp format: "YYYY-MM-DD hh:mm"
function formatLocalTimestamp(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// POST /reserve/:id(/:minutes)
exports.reservePoint = async (req, res) => {
  try {
    const rawId = req.params.id;
    const idStr = String(rawId).trim();
    const idNum = Number(idStr);

    // default 30'
    let minutes = req.params.minutes !== undefined ? Number(req.params.minutes) : 30;
    if (!Number.isFinite(minutes) || minutes <= 0) {
      minutes = 30; // safest default
    }
    // max 60'
    minutes = Math.min(minutes, 60);

    // Find point (bypass schema casting issues)
    let point = null;
    if (Number.isFinite(idNum)) point = await Point.collection.findOne({ pointid: idNum });
    if (!point) point = await Point.collection.findOne({ pointid: idStr });

    // 404 + error log
    if (!point) {
      return res.status(404).json(
        buildErrorLog(
          req,
          404,
          `Point with id ${idStr} not found`,
          "Check if pointid exists"
        )
      );
    }

    // Compute reservation end
    const now = new Date();
    const endDate = new Date(now.getTime() + minutes * 60 * 1000);

    // Atomic reserve ONLY if currently available
    const updateResult = await Point.collection.updateOne(
      { _id: point._id, status: "available" },
      {
        $set: {
          status: "reserved",
          reservationendtime: endDate,
          lastStatusChange: now
        }
      }
    );

    // Success
    if (updateResult.modifiedCount === 1) {
      return res.status(200).json({
        pointid: point.pointid,
        status: "reserved",
        reservationendtime: formatLocalTimestamp(endDate)
      });
    }

    // Reservation failed (was not available) -> epoch time
    return res.status(200).json({
      pointid: point.pointid,
      status: point.status,
      reservationendtime: "1970-01-01 00:00"
    });

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
