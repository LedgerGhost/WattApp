const Point = require("../../../models/Point");
const Reservation = require("../../../models/Reservation");
const PointStatusHistory = require("../../../models/PointStatusHistory");
const { buildErrorLog } = require("../utils/errorLog");

exports.dummyCompleteReservation = async (req, res) => {
  try {
    const rawId = req.params.id;
    const pointId = Number(rawId); // Assuming pointid is a Number

    // 1. Find the Point
    const point = await Point.findOne({ pointid: pointId });
    if (!point) {
      return res.status(404).json(
        buildErrorLog(req, 404, "Point not found", `No point found with id ${rawId}`)
      );
    }

    // Validation: Point must be 'reserved' to be completed
    if (point.status !== 'reserved') {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid Status", `Point is currently '${point.status}', but must be 'reserved' to complete a reservation.`));
    }

    // Find and Complete the Active Reservation
    // We update it manually here to ensure it does exactly what you asked
    const activeReservation = await Reservation.findOne({
        pointid: pointId,
        status: 'active',
        user_id: req.user._id   // Ensure we only complete the reservation if it belongs to the requesting user
    });

    if (activeReservation) {
        activeReservation.status = 'completed';
        activeReservation.end_time = new Date();
        await activeReservation.save();
    } else {
        // Warning: Point was reserved, but no active reservation document exists. 
        // We continue anyway to "fix" the point state.
        return res.status(400).json(
            buildErrorLog(req, 400, "Invalid Reservation", `No active reservation found for point ${pointId} and user ${req.user._id}`));
    }

    // 4. Update Point Status to Available
    point.status = 'available';
    point.reservationendtime = null;
    point.reservedBy = null;
    point.lastStatusChange = new Date();
    await point.save();

    // 5. Log History (reserved -> available)
    await PointStatusHistory.logStatusChange(
        point.pointid,
        'reserved',      // Old Status
        'available',     // New Status
        req.user ? req.user._id : null, // Triggered by (admin/user)
        'Dummy Completion Endpoint' // Reason
    );

    return res.status(200).json({message: "Reservation completed successfully",});

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal Server Error", err.message)
    );
  }
};