//a
const PROVIDER_NAME = "bestPowerGR";
const { points } = require("../utils/database"); // <-- must exist before functions
const { buildErrorLog } = require("../utils/errorLog");

exports.getPoints = (req, res) => {
  try {
    const status = req.query.status;
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

      result = points.filter(p => p.status === status);
    }

    // 204: success but empty response
    if (!result || result.length === 0) {
      return res.status(204).send();
    }

    result = result.map(p => ({ providerName: PROVIDER_NAME, ...p }));
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
