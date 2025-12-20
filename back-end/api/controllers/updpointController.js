//d

const { points } = require("../utils/database");

const ALLOWED_STATUS = [
  "available",
  "charging",
  "reserved",
  "malfunction",
  "offline"
];

exports.updatePoint = (req, res) => {
    const id = req.params.id;
    const { status, kwhprice } = req.body;

    const point = points.find(p => p.pointid == id);

    //  Δεν υπάρχει σημείο
    if (!point) {
        return res.status(404).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 404,
            error: `Point with id ${id} not found`,
            debuginfo: "Check if pointid exists"
        });
    }

    // Δεν δόθηκε τίποτα στο body
    if (status === undefined && kwhprice === undefined) {
        return res.status(400).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Empty body",
            debuginfo: "Provide status and/or kwhprice"
        });
    }

    //  Λάθος status
    if (status !== undefined && !ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: `Invalid status '${status}'`,
            debuginfo: "Allowed values: available, charging, reserved, malfunction, offline"
        });
    }

    //  Λάθος τιμή kwhprice
    if (kwhprice !== undefined && (typeof kwhprice !== "number" || kwhprice < 0)) {
        return res.status(400).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Invalid kwhprice",
            debuginfo: "kwhprice must be a positive number"
        });
    }

    // Update
    if (status !== undefined) {
        point.status = status;
    }

    if (kwhprice !== undefined) {
        point.kwhprice = kwhprice;
    }

    //  Success response
    return res.status(200).json({
        pointid: point.pointid,// leei oti theli string alla ta exi float
        status: point.status,
        kwhprice: point.kwhprice
    });
};
