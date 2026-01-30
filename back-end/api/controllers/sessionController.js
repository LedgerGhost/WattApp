//e+f
const Point = require("../../../models/Point");
const ChargingSession = require("../../../models/ChargingSession");
const { buildErrorLog } = require("../utils/errorLog");

// "YYYY-MM-DD hh:mm" -> Date (local time)
function parseTimestampToDate(ts) {
  if (typeof ts !== "string") return null;
  const isoLike = ts.replace(" ", "T");
  const d = new Date(isoLike);
  return isNaN(d.getTime()) ? null : d;
}

// Date -> "YYYY-MM-DD hh:mm" (local)
function formatLocalTimestamp(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function toCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const lines = data.map((obj) => headers.map((h) => `"${obj[h] ?? ""}"`).join(","));
  return [headers.join(","), ...lines].join("\n");
}

// --------- Mapping helpers (καθαρό boundary) ---------

// API body (spec) -> DB document (canonical)
function apiToDbSession(body, pointDoc, startDate, endDate) {
  const duration_minutes = Math.round((endDate - startDate) / (1000 * 60));

  const station_id = pointDoc?.external_station_id ?? null; // όπως στο Point schema σου
  const outlet_id = String(pointDoc?.pointid ?? body.pointid); // όπως βλέπεις στο Compass ("1945")

  return {
    user_id: null, // δεν δίνεται από το API
    station_id,
    pointid: Number(pointDoc?.pointid ?? body.pointid),
    outlet_id,
    reservation_id: null,

    status: "completed",

    start_time: startDate,
    end_time: endDate,
    duration_minutes,

    energy_delivered_kwh: body.totalkwh,

    vehicle_info: {
      battery_level_start: body.startsoc,
      battery_level_end: body.endsoc
    },

    cost: {
      energy_cost: Number((body.totalkwh * body.kwhprice).toFixed(2)),
      total: body.amount,
      currency: "EUR"
    }
  };
}

// DB doc (canonical) -> API response (spec)
function dbToApiSession(s) {
  const totalkwh = s.energy_delivered_kwh ?? null;

  // kwhprice: ιδανικά το βγάζουμε από energy_cost / kwh
  let kwhprice = null;
  if (totalkwh != null && totalkwh !== 0 && s.cost?.energy_cost != null) {
    kwhprice = Number((s.cost.energy_cost / totalkwh).toFixed(2));
  }

  return {
    starttime: s.start_time ? formatLocalTimestamp(s.start_time) : null,
    endtime: s.end_time ? formatLocalTimestamp(s.end_time) : null,
    startsoc: s.vehicle_info?.battery_level_start ?? null,
    endsoc: s.vehicle_info?.battery_level_end ?? null,
    totalkwh,
    kwhprice,
    amount: s.cost?.total ?? null
  };
}

// e) POST /newsession
exports.newSession = async (req, res) => {
  try {
    const { pointid, starttime, endtime, startsoc, endsoc, totalkwh, kwhprice, amount } = req.body;

    // All fields mandatory 
    if (
      pointid === undefined ||
      !starttime ||
      !endtime ||
      startsoc === undefined ||
      endsoc === undefined ||
      totalkwh === undefined ||
      kwhprice === undefined ||
      amount === undefined
    ) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Missing required fields", "All fields are mandatory")
      );
    }

    // Validate timestamps
    const startDate = parseTimestampToDate(starttime);
    const endDate = parseTimestampToDate(endtime);
    if (!startDate || !endDate) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid timestamp format", "Expected 'YYYY-MM-DD hh:mm'")
      );
    }
    if (endDate < startDate) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid time range", "endtime must be after starttime")
      );
    }

    // Basic validations
    if (
      typeof startsoc !== "number" || startsoc < 0 || startsoc > 100 ||
      typeof endsoc !== "number" || endsoc < 0 || endsoc > 100 ||
      endsoc < startsoc ||
      typeof totalkwh !== "number" || totalkwh < 0 ||
      typeof kwhprice !== "number" || kwhprice < 0 ||
      typeof amount !== "number" || amount < 0
    ) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid session values", "Check SOC range, energy, price, amount")
      );
    }

    // Check point exists
    const pidStr = String(pointid).trim();
    const pidNum = Number(pidStr);

    let point = null;
    if (Number.isFinite(pidNum)) point = await Point.collection.findOne({ pointid: pidNum });
    if (!point) point = await Point.collection.findOne({ pointid: pidStr });

    if (!point) {
      return res.status(400).json(
        buildErrorLog(req, 400, `Point with id ${pidStr} not found`, "Invalid pointid")
      );
    }

    // Canonical DB write
    const dbDoc = apiToDbSession(req.body, point, startDate, endDate);
    await ChargingSession.create(dbDoc);

    return res.status(200).send();
  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};

// f) GET /sessions/:id/:from/:to
exports.getSessions = async (req, res) => {
  try {
    const { id, from, to } = req.params;
    const format = (req.query.format || "json").toLowerCase();

    if (format !== "json" && format !== "csv") {
      return res.status(400).json(
        buildErrorLog(req, 400, `Invalid format '${format}'`, "Allowed values: json, csv")
      );
    }

    // Validate date format YYYYMMDD
    if (!from || !to || from.length !== 8 || to.length !== 8) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid date format", "Dates must be YYYYMMDD")
      );
    }

    const y1 = from.substring(0, 4), m1 = from.substring(4, 6), d1 = from.substring(6, 8);
    const y2 = to.substring(0, 4), m2 = to.substring(4, 6), d2 = to.substring(6, 8);

    const fromStart = new Date(`${y1}-${m1}-${d1}T00:00:00`);
    const toEnd = new Date(`${y2}-${m2}-${d2}T23:59:59.999`);

    if (isNaN(fromStart.getTime()) || isNaN(toEnd.getTime())) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid date format", `from: ${from}, to: ${to}`)
      );
    }
    if (fromStart > toEnd) {
      return res.status(400).json(
        buildErrorLog(req, 400, "Invalid date range", "'from' must be <= 'to'")
      );
    }

    // Check point exists
    const idStr = String(id).trim();
    const idNum = Number(idStr);

    // let point = null;
    // if (Number.isFinite(idNum)) point = await Point.collection.findOne({ pointid: idNum });
    // if (!point) point = await Point.collection.findOne({ pointid: idStr });

    // if (!point) {
    //   return res.status(204).json(
    //     buildErrorLog(req, 204, `Point with id ${idStr} not found`, "Invalid pointid")
    //   );
    // }

    // // Canonical DB query (start_time)
    // const sessDocs = await ChargingSession.find({
    //   pointid: point.pointid,
    //   start_time: { $gte: fromStart, $lte: toEnd }
    // }).lean().sort({ start_time: -1 });

    // Canonical DB query (start_time)
    const sessDocs = await ChargingSession.find({
      pointid: idNum,
      start_time: { $gte: fromStart, $lte: toEnd }
    }).lean().sort({ start_time: -1 });

    if (!sessDocs || sessDocs.length === 0) {
      return res.status(204).send();
    }

    //  Spec response (old names)
    const result = sessDocs.map(dbToApiSession);

    if (format === "csv") {
      const csv = toCSV(result);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.status(200).send(csv);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
