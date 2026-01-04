// e + f

const { points, sessions } = require("../utils/database");
const { buildErrorLog } = require("../utils/errorLog");

exports.newSession = (req, res) => {
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

    // Όλα τα πεδία mandatory
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
        buildErrorLog(
          req,
          400,
          "Missing required fields",
          "All fields are mandatory"
        )
      );
    }

    // Υπάρχει το point;
    const point = points.find(p => p.pointid == pointid);
    if (!point) {
      return res.status(404).json(
        buildErrorLog(
          req,
          404,
          `Point with id ${pointid} not found`,
          "Invalid pointid"
        )
      );
    }

    // Basic validations
    if (
      startsoc < 0 || startsoc > 100 ||
      endsoc < 0 || endsoc > 100 ||
      endsoc < startsoc ||
      totalkwh < 0 ||
      kwhprice < 0 ||
      amount < 0
    ) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          "Invalid session values",
          "Check SOC range, energy, price, amount"
        )
      );
    }

    // Store session (mock)
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

    // Success: empty body
    return res.status(200).send();

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};


// f. GET /sessions/:id/:from/:to
exports.getSessions = (req, res) => {
  try {
    const { id, from, to } = req.params;

    // YYYYMMDD -> Date at start of day
    const parseDate = (d) => {
      const y = d.substring(0, 4);
      const m = d.substring(4, 6);
      const day = d.substring(6, 8);
      return new Date(`${y}-${m}-${day}T00:00:00`);
    };

    // basic date validation
    if (!from || !to || from.length !== 8 || to.length !== 8) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          "Invalid date format",
          "Dates must be YYYYMMDD"
        )
      );
    }

    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    // Extra safety: invalid dates
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          "Invalid date format. Expected YYYYMMDD",
          `from: ${from}, to: ${to}`
        )
      );
    }

    // from must be <= to
    if (fromDate > toDate) {
      return res.status(400).json(
        buildErrorLog(
          req,
          400,
          "Invalid date range: 'from' date must be before or equal to 'to' date",
          `from: ${from}, to: ${to}`
        )
      );
    }

    // check point exists
    const pointExists = points.find(p => p.pointid == id);
    if (!pointExists) {
      return res.status(404).json(
        buildErrorLog(
          req,
          404,
          `Point with id ${id} not found`,
          "Invalid pointid"
        )
      );
    }

    // filter sessions
    const result = sessions
      .filter(s => {
        if (s.pointid != id) return false;
        const start = new Date(s.starttime.replace(" ", "T"));
        return start >= fromDate && start <= toDate;
      })
      .map(s => ({
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

  } catch (err) {
    return res.status(500).json(
      buildErrorLog(req, 500, "Internal server error", err.message)
    );
  }
};
