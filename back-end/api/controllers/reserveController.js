//c) POST /reserve/:id(/:minutes)
// api/controllers/reserveController.js
const Point = require("../../../models/Point");
const Reservation = require("../../../models/Reservation");
const PointStatusHistory = require("../../../models/PointStatusHistory");
const { buildErrorLog } = require("../utils/errorLog");

function formatLocalTimestamp(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

const MAX_RESERVATION_MINUTES = 60;
exports.reservePoint = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
        return res.status(400).json(buildErrorLog(req, 400, "Auth user missing on request", "req.user._id missing"));
    }

    const idStr = String(req.params.id).trim();
    const idNum = Number(idStr);
    if (!Number.isFinite(idNum)) {
      return res
        .status(400)
        .json(buildErrorLog(req, 400, "Invalid point id", `id must be numeric, got: ${idStr}`));
    }

    let minutes = req.params.minutes !== undefined ? Number(req.params.minutes) : 30;
    if (!Number.isFinite(minutes) || minutes <= 0) minutes = 30;
    minutes = Math.min(minutes, MAX_RESERVATION_MINUTES);

    const point = await Point.findOne({ pointid: idNum }).lean();
    if (!point) {
      return res
        .status(400)
        .json(buildErrorLog(req, 400, `Point with id ${idStr} not found`, "Check if pointid exists"));
    }

    const pointidNum = point.pointid;

    // const activeForPoint = await Reservation.findActiveByPoint(pointidNum);
    // if (activeForPoint) {
    //   return res.status(200).json({
    //     pointid: point.pointid,
    //     status: point.status,
    //     reservationendtime: "1970-01-01 00:00",
    //   });
    // }

    // --- CHANGED LOGIC START ---
    // Instead of querying the Reservation table, we just check the status directly
    if (point.status !== "available") {
      return res.status(200).json({
        pointid: point.pointid,
        status: point.status, // This returns 'occupied', 'reserved', or 'offline'
        reservationendtime: "1970-01-01 00:00", // The flag for "Unavailable"
      });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + minutes * 60 * 1000);

    const upd = await Point.updateOne(
      { pointid: idNum, status: "available" },
      {
        $set: {
          status: "reserved",
          reservationendtime: endDate,
          reservedBy: userId,
          lastStatusChange: now,
        },
      }
    );

    if (upd.modifiedCount !== 1) {
      return res.status(200).json({
        pointid: point.pointid,
        status: point.status,
        reservationendtime: "1970-01-01 00:00",
      });
    }

    try {
      await Reservation.createReservation(pointidNum, userId, minutes, uniquePerUser = false);
    } catch (e) {
      await Point.updateOne(
        { pointid: idNum, status: "reserved", reservedBy: userId },
        {
          $set: {
            status: "available",
            reservationendtime: null,
            reservedBy: null,
            lastStatusChange: new Date(),
          },
        }
      );

      return res.status(500).json(buildErrorLog(req, 500, "Failed to create reservation", e.message));
    }

    // LOG HISTORY: Only log if reservation creation succeeded
    // We know old state was 'available' because the updateOne query required it.
    // await PointStatusHistory.logStatusChange(
    //   pointidNum,          // Point ID
    //   "available",         // Old State
    //   "reserved",          // New State
    //   userId,              // Triggered By
    //   "API Reservation"   // Reason
    // );

    point.status = "reserved";
    point.reservationendtime = endDate;
    point.reservedBy = userId;

    return res.status(200).json({
      pointid: point.pointid,
      status: "reserved",
      reservationendtime: formatLocalTimestamp(endDate),
    });

  } catch (err) {
    return res.status(500).json(buildErrorLog(req, 500, "Internal server error", err.message));
  }
};
