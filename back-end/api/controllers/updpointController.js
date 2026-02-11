// d) POST /updpoint/:id

const Point = require("../../../models/Point");
const Reservation = require("../../../models/Reservation");
const PointStatusHistory = require("../../../models/PointStatusHistory");
const { buildErrorLog } = require("../utils/errorLog");

const ALLOWED_STATUS = [
  "available",
  "charging",
  "reserved",
  "malfunction",
  "offline"
];

exports.updatePoint = async (req, res) => {
  try {
    const allowedKeys = ["status", "kwhprice"];
    const bodyKeys = Object.keys(req.body);

    const invalidKeys = bodyKeys.filter(k => !allowedKeys.includes(k));
    if (invalidKeys.length > 0) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid fields in body", `Allowed fields: ${allowedKeys.join(", ")}`));
      }
    const rawId = req.params.id;
    const idStr = String(rawId).trim();
    const idNum = Number(idStr);

    const { status, kwhprice } = req.body;

    // 400: empty body
    if (status === undefined && kwhprice === undefined) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Empty body", "Provide status and/or kwhprice")
      );
    }

    // 400: invalid status
    if (status !== undefined && !ALLOWED_STATUS.includes(status)) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          `Invalid status '${status}'`,
          "Allowed values: available, charging, reserved, malfunction, offline"
        )
      );
    }

    // 400: invalid kwhprice
    if (kwhprice !== undefined && (typeof kwhprice !== "number" || kwhprice < 0)) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid kwhprice", "kwhprice must be a non-negative number")
      );
    }

    // Find point (bypass schema casting issues)
    let point = null;
    if (Number.isFinite(idNum)) point = await Point.collection.findOne({ pointid: idNum });
    if (!point) point = await Point.collection.findOne({ pointid: idStr });

    // 400: point not found
    if (!point) {
      return res.status(400).json(
        buildErrorLog(req, 400, `Point with id ${idStr} not found`, "Check if pointid exists")
      );
    }

    // Build update
    const $set = {};
    if (status !== undefined) {
      // LOG HISTORY: Only if status is provided AND different from current
      if (point.status !== status) {
        await PointStatusHistory.logStatusChange(
          point.pointid,                 // Point ID
          point.status,                  // Old State
          status,                        // New State
          req.user ? req.user._id : null, // Triggered By (if auth middleware exists)
          "API Update"                   // Reason
        );
      }
      
      $set.status = status;

      // Handle Reservation Logic 
      // Check if a reservation exists and update it based on the new status
      if (point.reservedBy) {
          await Reservation.handlePointStatusChange(
              point.pointid, 
              point.reservedBy, 
              point.status, // Old Status
              status        // New Status
          );
      }

      $set.lastStatusChange = new Date();

    }
    if (kwhprice !== undefined) {
      $set.kwhprice = kwhprice;
    }

    await Point.collection.updateOne({ _id: point._id }, { $set });

    // Return the updated values (use local computed ones, no need for second read)
    return res.status(200).json({
      pointid: point.pointid,
      status: status !== undefined ? status : point.status,
      kwhprice: kwhprice !== undefined ? kwhprice : point.kwhprice
    });

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
