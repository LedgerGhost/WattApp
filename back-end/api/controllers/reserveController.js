//c

const { points } = require("../utils/database");
const { formatLocalTimestamp } = require("../utils/time");


// POST /reserve/:id(/:minutes)
exports.reservePoint = (req, res) => {
    const id = req.params.id;
    let minutes = req.params.minutes ? parseInt(req.params.minutes) : 30; // default 30'

    // Max limit 60'
    minutes = Math.min(minutes, 60);

    const point = points.find(p => p.pointid == id);

    if (!point) {
        return res.status(404).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 404,
            error:`Point with id ${id} not found`,
            debuginfo:"Check if pointid exists"
        });
    }

    // Must be available to reserve
    if (point.status !== "available") {
        return res.status(400).json({
            pointid: id,
            status: point.status,
            reservationendtime: "1970-01-01 00:00" // failed reserve
        });
    }

    // Change status
    point.status = "reserved";

    // Calculate end time (YYYY-MM-DD hh:mm)
    const endDate = new Date(Date.now() + minutes * 60 * 1000);
    const end = formatLocalTimestamp(endDate);


    point.reservationendtime = end; // store it so it will appear in /point/:id too later

    return res.status(200).json({
        pointid: point.pointid,
        status: "reserved",
        reservationendtime: end
    });
};
