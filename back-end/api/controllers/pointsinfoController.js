//like a) but extra station_name and connector_type

const Point = require("../../../models/Point");
const { buildErrorLog } = require("../utils/errorLog");


function toCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const lines = data.map(obj => headers.map(h => `"${obj[h] ?? ""}"`).join(","));
  return [headers.join(","), ...lines].join("\n");
}

exports.getPointsinfo = async (req, res) => {
  try {
    const status = req.query.status;
    const format = (req.query.format || "json").toLowerCase();

    const allowed = ["available", "charging", "reserved", "malfunction", "offline"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          `Invalid status '${status}'`,
          "Allowed values: available, charging, reserved, malfunction, offline"
        )
      );
    }

    if (format !== "json" && format !== "csv") {
      return res.status(400).json(
        buildErrorLog(req, 400, `Invalid format '${format}'`, "Allowed values: json, csv")
      );
    }

    const query = status ? { status } : {};
    const docs = await Point.find(query).lean();

    if (!docs || docs.length === 0) {
      return res.status(204).send();
    }

    const result = docs.map(p => ({
      providerName: p.providerName,
      pointid: p.pointid,
      lon: p.lon,
      lat: p.lat,
      status: p.status,
      cap: p.cap,

      // ✅ extra fields (από charge_points)
      station_name: p.station_name ?? null,
      connector_type: p.connector_type ?? null,
      kwhprice: p.kwhprice ?? null
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
