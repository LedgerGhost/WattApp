//show the active reservation of auhthenticated user

const { reservations,points } = require("../utils/database");

exports.getActiveReservation = (req, res) => {
    const userId = req.user.id;

    const active = reservations.find(r =>
        r.userId === userId &&
        r.reservationendtime &&
        new Date(r.reservationendtime.replace(" ", "T")) > new Date()
    );

    if (!active) {
        return res.status(204).send();
    }

    return res.status(200).json({
        pointid: active.pointid,
        reservationendtime: active.reservationendtime
    });
};

//cancel active reservation(different endpoint)

exports.cancelReservation = (req, res) => {

    const userId = req.user.id;

    const index = reservations.findIndex(r =>
        r.userId === userId &&
        r.reservationendtime &&
        new Date(r.reservationendtime.replace(" ", "T")) > new Date()
    );

    if (index === -1) {
        return res.status(400).json({
            error: "No active reservation to cancel"
        });
    }

    const cancelled = reservations[index];
    reservations.splice(index, 1);

    const point = points.find(p => p.pointid === cancelled.pointid);
    if (point) {
        point.status = "available";
        point.reservationendtime = "1970-01-01 00:00";
    }

    return res.status(200).json({
        pointid: cancelled.pointid,
        status: "available"
    });
};

