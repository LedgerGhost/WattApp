// show the active reservation of authenticated user

const { reservations, points } = require("../utils/database");
const { buildErrorLog } = require("../utils/errorLog");

exports.getActiveReservation = (req, res) => {
  try {
    const userId = req.user.id;

    const active = reservations.find(r =>
      r.userId === userId &&
      r.reservationendtime &&
      new Date(r.reservationendtime.replace(" ", "T")) > new Date()
    );

    // 204: επιτυχής κλήση αλλά χωρίς δεδομένα (ΣΩΣΤΟ)
    if (!active) {
      return res.status(204).send();
    }

    return res.status(200).json({
      pointid: active.pointid,
      reservationendtime: active.reservationendtime
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


// cancel active reservation (user has at most one active)

exports.cancelReservation = (req, res) => {
  try {
    const userId = req.user.id;

    const index = reservations.findIndex(r =>
      r.userId === userId &&
      r.reservationendtime &&
      new Date(r.reservationendtime.replace(" ", "T")) > new Date()
    );

    // 400: bad request (δεν υπάρχει ενεργή κράτηση)
    if (index === -1) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          "No active reservation to cancel",
          "User has no active reservation"
        )
      );
    }

    const cancelled = reservations[index];
    reservations.splice(index, 1);

    const point = points.find(p => p.pointid === cancelled.pointid);
    if (point) {
      point.status = "available";
      point.reservationendtime = "1970-01-01 00:00";
    }

    return res.status(200).json({
      pointid: cancelled.pointid,
      status: "available"
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
