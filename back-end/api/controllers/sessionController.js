//e

const { points, sessions } = require("../utils/database");

exports.newSession = (req, res) => {
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

    // Έλεγχος ότι υπάρχουν ΟΛΑ τα πεδία
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
        return res.status(400).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Missing required fields",
            debuginfo: "All fields are mandatory"
        });
    }

    // Υπάρχει το point;
    const point = points.find(p => p.pointid == pointid);
    if (!point) {
        return res.status(404).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 404,
            error: `Point with id ${pointid} not found`,
            debuginfo: "Invalid pointid"
        });
    }

    // Βασικά validations
    if (
        startsoc < 0 || startsoc > 100 ||
        endsoc < 0 || endsoc > 100 ||
        endsoc < startsoc ||
        totalkwh < 0 ||
        kwhprice < 0 ||
        amount < 0
    ) {
        return res.status(400).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Invalid session values",
            debuginfo: "Check SOC range, energy, price, amount"
        });
    }

    // Καταγραφή session (mock)
    sessions.push({
        pointid,
        starttime,
        endtime,
        startsoc,
        endsoc,
        totalkwh,
        kwhprice,
        amount
    });

    // Επιτυχία → ΚΕΝΟ body
    return res.status(200).send();
};

//f
exports.getSessions = (req, res) => {
    const { id, from, to } = req.params;

    // YYYYMMDD -> Date
    const parseDate = (d) => {
        const y = d.substring(0,4);
        const m = d.substring(4,6);
        const day = d.substring(6,8);
        return new Date(`${y}-${m}-${day}T00:00:00`);
    };

    // basic date validation
    if (from.length !== 8 || to.length !== 8) {
        return res.status(400).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 400,
            error: "Invalid date format",
            debuginfo: "Dates must be YYYYMMDD"
        });
    }

    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    // check point exists
    const pointExists = points.find(p => p.pointid == id);
    if (!pointExists) {
        return res.status(404).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 404,
            error: `Point with id ${id} not found`,
            debuginfo: "Invalid pointid"
        });
    }

    // filter sessions
    const result = sessions.filter(s => {
        if (s.pointid != id) return false;

        const start = new Date(s.starttime.replace(" ", "T"));
        return start >= fromDate && start <= toDate;
    }).map(s => ({
        starttime: s.starttime,
        endtime: s.endtime,
        startsoc: s.startsoc,
        endsoc: s.endsoc,
        totalkwh: s.totalkwh,
        kwhprice: s.kwhprice,
        amount: s.amount
    }));

    // no content
    if (result.length === 0) {
        return res.status(204).send();
    }

    return res.status(200).json(result);
};
