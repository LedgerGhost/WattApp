// a) /points



const Point = require("../../../models/Point");

const { buildErrorLog } = require("../utils/errorLog");

function toCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const lines = data.map(obj => headers.map(h => `"${obj[h] ?? ""}"`).join(","));
  return [headers.join(","), ...lines].join("\n");
}

exports.getPoints = async (req, res) => {
  try {
    const status = req.query.status;
    const format = (req.query.format || "json").toLowerCase(); // default για API

    // (προαιρετικό αλλά καλό) validate format
    if (format !== "json" && format !== "csv") {
      return res.status(400).json(
        buildErrorLog(req, 400, `Invalid format '${format}'`, "Allowed values: json, csv")
      );
    }

    // Spec for /points: invalid status => 400
    if (status) {
      const allowed = ["available", "charging", "reserved", "malfunction", "offline"];
      if (!allowed.includes(status)) {
        return res.status(400).json(
          buildErrorLog(
            req,
            400,
            `Invalid status '${status}'`,
            "Allowed values: available, charging, reserved, malfunction, offline"
          )
        );
      }
    }

    // Query DB
    const query = status ? { status } : {};
    let result = await Point.find(query).lean();

    // 204: success but empty response
    if (!result || result.length === 0) {
      return res.status(204).send();
    }

    // Ensure providerName is the constant required by the assignment
    // and output only the fields required by the /points spec
    result = result.map(p => ({
      providerName: p.providerName,
      pointid: p.pointid,
      lon: p.lon,
      lat: p.lat,
      status: p.status,
      cap: p.cap
    }));

    // ===== FORMAT HANDLING =====
    if (format === "csv") {
      const csv = toCSV(result);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.status(200).send(csv);
    }

    // default json
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
