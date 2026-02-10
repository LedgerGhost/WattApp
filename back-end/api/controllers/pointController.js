// b) GET /api/point/:id

const Point = require("../../../models/Point");
const { buildErrorLog } = require("../utils/errorLog");

exports.getPointById = async (req, res) => {
  try {
    const rawId = req.params.id;
    const idStr = String(rawId).trim();
    const idNum = Number(idStr);

    //  Bypass Mongoose casting: query directly on the underlying collection
    let point = null;

    // 1) try numeric match (what your DB likely has)
    if (Number.isFinite(idNum)) {
      point = await Point.collection.findOne({ pointid: idNum });
    }

    // 2) fallback: try string match (in case some docs are strings)
    if (!point) {
      point = await Point.collection.findOne({ pointid: idStr });
    }

    if (!point) {
      return res.status(204).send();
    }

    // reservationendtime rule (εκφώνηση):
    // if NOT reserved -> return NOW
    const reservationendtime =
      point.status === "reserved" && point.reservationendtime
        ? Point.formatTimestamp(point.reservationendtime)
        : Point.formatTimestamp(new Date());

    return res.status(200).json({
      pointid: point.pointid,
      lon: point.lon,
      lat: point.lat,
      status: point.status,
      cap: point.cap,
      reservationendtime,
      kwhprice: point.kwhprice,
      station_name: point.station_name ?? null,
      connector_type: point.connector_type ?? null
    });

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
