const Point = require("../../../models/Point");
const PointStatusHistory = require("../../../models/PointStatusHistory");

exports.getPointStatusHistory = async (req, res) => {
    try {
        // SETUP & INPUTS
        const { pointid, from, to } = req.params;
        const normalizedFormat = (req.query.format || 'json').toLowerCase();

        // VALIDATE FORMAT (400 Bad Request)
        const allowedFormats = ['json', 'csv'];
        if (!allowedFormats.includes(normalizedFormat)) {
            return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: `Invalid format '${req.query.format}'. Allowed values: json, csv`,
                debuginfo: `format: ${req.query.format}`
            });
        }

        // VALIDATE POINT EXISTS (204 No Content)
        // We use the Point model to check if this ID exists
        // const pointExists = await Point.findOne({ pointid: pointid });
        // if (!pointExists) {
        //     return res.status(205).send();
        // }

        // FETCH DATA (Using Model's Static Method)
        // The model handles date parsing, validation, sorting, and formatting internally.
        let historyData;
        try {
            historyData = await PointStatusHistory.findByPointAndDateRange(pointid, from, to);
        } catch (dateError) {
            // Catch specific date errors thrown by the model (Invalid format, etc.)
            return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: dateError.message,
                debuginfo: `from: ${from}, to: ${to}`
            });
        }

        // HANDLE EMPTY RESULTS (204 No Content)
        if (!historyData || historyData.length === 0) {
            return res.status(204).send();
        }

        // HANDLE CSV OUTPUT
        if (normalizedFormat === 'csv') {
            const csvHeader = 'timeref,old_state,new_state\n';
            // Use the model's helper to generate rows
            const csvRows = PointStatusHistory.toCSV(historyData);
            
            res.setHeader('Content-Type', 'text/csv');
            return res.status(200).send(csvHeader + csvRows);
        }

        // DEFAULT: JSON OUTPUT
        return res.status(200).json(historyData);

    } catch (error) {
        // UNEXPECTED SERVER ERRORS (500)
        console.error("GetPointStatusHistory Error:", error);
        return res.status(500).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 500,
            error: "Internal Server Error",
            debuginfo: error.message
        });
    }
};