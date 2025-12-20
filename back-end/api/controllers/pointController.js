//b

const { points } = require("../utils/database");
const { formatLocalTimestamp } = require("../utils/time");

// GET /api/point/:id
exports.getPointById = (req, res) => {
    const id = req.params.id;
    const point = points.find(p => p.pointid == id);

    if (!point) {
        return res.status(404).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 404,
            error:`Point with id ${id} not found`,
            debuginfo:"Check if id exists in mock DB"
        });
    }

    // timestamp format "YYYY-MM-DD hh:mm"
    //const now = new Date().toISOString().slice(0,16).replace("T"," ");

    return res.json({
        pointid: point.pointid,
        lon: point.lon,
        lat: point.lat,
        status: point.status,
        cap: point.cap,
        reservationendtime: point.reservationendtime || formatLocalTimestamp(new Date()),  // προσωρινά
        kwhprice: point.kwhprice || 0.50   // placeholder price
    });
};
