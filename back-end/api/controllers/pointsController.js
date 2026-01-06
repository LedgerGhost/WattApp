//a

const PROVIDER_NAME = "bestPowerGR";
const { points } = require("../utils/database");
const { buildErrorLog } = require("../utils/errorLog");

function toCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return "";
  }

  const headers = Object.keys(data[0]);
  const lines = data.map(obj =>
    headers.map(h => `"${obj[h] ?? ""}"`).join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}

exports.getPoints = (req, res) => {
  try {
    const status = req.query.status;
    const format = req.query.format || "json"; // default για API
    let result = points;

    if (status) {
      const allowed = ["available", "charging", "reserved", "malfunction", "offline"];

      if (!allowed.includes(status)) {
        return res.status(401).json(
          buildErrorLog(
            req,
            401,
            `Invalid status '${status}'`,
            "Allowed values: available, charging, reserved, malfunction, offline"
          )
        );
      }

      result = result.filter(p => p.status === status);
    }

    // 204: success but empty response
    if (!result || result.length === 0) {
      return res.status(204).send();
    }

    result = result.map(p => ({ providerName: PROVIDER_NAME, ...p }));

    // ===== FORMAT HANDLING =====
    if (format === "csv") {
      const csv = toCSV(result);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.status(200).send(csv);
    }

    // default json
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
