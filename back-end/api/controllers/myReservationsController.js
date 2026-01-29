const AuthSession = require("../../../models/AuthSession");
const Reservation = require("../../../models/Reservation");
const Point = require("../../../models/Point");
const { buildErrorLog } = require("../utils/errorLog");

// GET /api/myreservations
// Returns all reservations for the authenticated user (active + past)
exports.getMyReservations = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res
        .status(401)
        .json(buildErrorLog(req, 401, "No authentication token provided"));
    }

    const user = await AuthSession.getUserFromToken(token);

    if (!user) {
      return res
        .status(401)
        .json(buildErrorLog(req, 401, "Invalid or expired token"));
    }

    const reservations = await Reservation.find({ user_id: user._id })
      .sort({ start_time: -1 })
      .lean();

    if (!reservations || reservations.length === 0) {
      // 204: success but no content
      return res.status(204).send();
    }

    // Fetch point details for all pointids
    const pointids = [...new Set(reservations.map(r => r.pointid))];
    const points = await Point.find({ pointid: { $in: pointids } }).lean();
    const pointMap = Object.fromEntries(points.map(p => [p.pointid, p]));

    return res.status(200).json(
      reservations.map(r => ({
        id: r._id,
        pointid: r.pointid,
        status: r.status,
        start_time: r.start_time,
        end_time: r.end_time,
        duration_minutes: r.duration_minutes,
        // Point details
        station_name: pointMap[r.pointid]?.station_name || null,
        address: pointMap[r.pointid]?.address || null,
        connector_type: pointMap[r.pointid]?.connector_type || null,
        power_kw: pointMap[r.pointid]?.cap || null,
      }))
    );
  } catch (err) {
    return res
      .status(500)
      .json(
        buildErrorLog(
          req,
          500,
          "Internal server error while fetching reservations",
          err.message
        )
      );
  }
};

