//when succesfull reservation store which user did it
const { reservations } = require("../utils/database");

module.exports = (req, res, next) => {

  const originalSend = res.send;
  const originalJson = res.json;

  function logReservation(body) {
    if (
      req.method === "POST" &&
      req.path.startsWith("/reserve/") &&
      res.statusCode === 200 &&
      req.user &&
      body?.reservationendtime
    ) {
      reservations.push({
        userId: req.user.id,
        pointid: Number(req.params.id),
        reservationendtime: body.reservationendtime
      });
    }
  }

  res.send = function (body) {
    logReservation(body);
    return originalSend.call(this, body);
  };

  res.json = function (body) {
    logReservation(body);
    return originalJson.call(this, body);
  };

  next();
};
