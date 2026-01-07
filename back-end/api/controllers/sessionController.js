// e + f (MongoDB)


const Point = require("../../../models/Point");
const ChargingSession = require("../../../models/ChargingSession"); 
const { buildErrorLog } = require("../utils/errorLog");

// "YYYY-MM-DD hh:mm" -> Date (local time)
function parseTimestampToDate(ts) {
  if (typeof ts !== "string") return null;
  // Accept "YYYY-MM-DD hh:mm"
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
  const lines = data.map(obj => headers.map(h => `"${obj[h] ?? ""}"`).join(","));
  return [headers.join(","), ...lines].join("\n");
}

// e) POST /newsession
exports.newSession = async (req, res) => {
  
  try {
    const {
      pointid,
      starttime,
      endtime,
      startsoc,
      endsoc,
      totalkwh,
      kwhprice,
      amount
    } = req.body;

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

    // Validate timestamps format & parse
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

    // Check point exists (bypass casting issues like before)
    const pidStr = String(pointid).trim();
    const pidNum = Number(pidStr);

    let point = null;
    if (Number.isFinite(pidNum)) point = await Point.collection.findOne({ pointid: pidNum });
    if (!point) point = await Point.collection.findOne({ pointid: pidStr });

    if (!point) {
      return res.status(404).json(
        buildErrorLog(req, 404, `Point with id ${pidStr} not found`, "Invalid pointid")
      );
    }

    // Store session in MongoDB
    // We store timestamps as Date (best for range queries).
    await ChargingSession.create({
      pointid: point.pointid, // keep same type as DB (usually Number)
      starttime: startDate,
      endtime: endDate,
      startsoc,
      endsoc,
      totalkwh,
      kwhprice,
      amount
    });
   


    // Success: empty body
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
    const format = (req.query.format || "json").toLowerCase(); // default json

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

    let point = null;
    if (Number.isFinite(idNum)) point = await Point.collection.findOne({ pointid: idNum });
    if (!point) point = await Point.collection.findOne({ pointid: idStr });

    if (!point) {
      return res.status(404).json(
        buildErrorLog(req, 404, `Point with id ${idStr} not found`, "Invalid pointid")
      );
    }

    // Query sessions by pointid + starttime within [fromStart, toEnd]
    const sessDocs = await ChargingSession.find({
      pointid: point.pointid,
      starttime: { $gte: fromStart, $lte: toEnd }
    }).lean();

    if (!sessDocs || sessDocs.length === 0) {
      return res.status(204).send();
    }

    const result = sessDocs.map(s => ({
      starttime: s.starttime instanceof Date ? formatLocalTimestamp(s.starttime) : s.starttime,
      endtime: s.endtime instanceof Date ? formatLocalTimestamp(s.endtime) : s.endtime,
      startsoc: s.startsoc,
      endsoc: s.endsoc,
      totalkwh: s.totalkwh,
      kwhprice: s.kwhprice,
      amount: s.amount
    }));

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
