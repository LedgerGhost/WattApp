// d

const { points } = require("../utils/database");
const { buildErrorLog } = require("../utils/errorLog");

const ALLOWED_STATUS = [
  "available",
  "charging",
  "reserved",
  "malfunction",
  "offline"
];

exports.updatePoint = (req, res) => {
  try {
    const id = req.params.id;
    const { status, kwhprice } = req.body;

    const point = points.find(p => p.pointid == id);

    // 404: point not found
    if (!point) {
      return res.status(404).json(
        buildErrorLog(
          req,
          404,
          `Point with id ${id} not found`,
          "Check if pointid exists"
        )
      );
    }

    // 400: empty body
    if (status === undefined && kwhprice === undefined) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          "Empty body",
          "Provide status and/or kwhprice"
        )
      );
    }

    // 400: invalid status
    if (status !== undefined && !ALLOWED_STATUS.includes(status)) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          `Invalid status '${status}'`,
          "Allowed values: available, charging, reserved, malfunction, offline"
        )
      );
    }

    // 400: invalid kwhprice
    // Δέχεται number (όπως το στέλνεις από Postman ως JSON number)
    if (kwhprice !== undefined && (typeof kwhprice !== "number" || kwhprice < 0)) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          "Invalid kwhprice",
          "kwhprice must be a non-negative number"
        )
      );
    }

    // Update
    if (status !== undefined) {
      point.status = status;
    }
    if (kwhprice !== undefined) {
      point.kwhprice = kwhprice;
    }

    // 200 success
    return res.status(200).json({
      pointid: point.pointid,   // κρατάς number για συνέπεια με τα παραδείγματα
      status: point.status,
      kwhprice: point.kwhprice
    });

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
