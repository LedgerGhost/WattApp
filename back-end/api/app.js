const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const Reservation = require('../../models/Reservation');
const PointStatusHistory = require('../../models/PointStatusHistory');

// Schedule: Run every minute
// Syntax: * * * * * (Minute Hour Day Month Weekday)
cron.schedule('* * * * *', async () => {
  try {
    const count = await Reservation.expireOverdue(PointStatusHistory);
    if (count > 0) {
      console.log(`🧹 Cleanup: Expired ${count} overdue reservations.`);
    }
  } catch (err) {
    console.error("❌ Auto-expiration failed:", err.message);
  }
});

/* Import routes */

const app = express();
app.use(cors());
app.use(express.json());


const { buildErrorLog } = require("./utils/errorLog");


/* Routes used */
app.use("/api/admin",require("./routes/admin"));

// Middleware to check DB connection before proceeding to other routes from now on
const checkDbConnection = require('./middlewares/dbcheck');

app.use('/api', checkDbConnection);
app.use("/api/auth",require("./routes/auth")); //for signup/login
app.use("/api",require("./routes/points")); //a
app.use("/api", require("./routes/point")); //b
app.use("/api", require("./routes/reserve")); //c
app.use("/api", require("./routes/updpoint"));//d
app.use("/api",require("./routes/sessions")); //e,f
app.use("/api/pointstatus", require("./routes/pointstatus")); //g

app.use("/api/USERreserve", require("./routes/USERreserve")); // extra 
app.use("/api/pointsbystation", require("./routes/pointsbystation")); // extra
app.use("/api", require("./routes/navigate")); // extra
app.use("/api", require ("./routes/pointsinfo")); // extra
app.use("/api", require("./routes/myreservations")); // extra


app.use((req, res) => {
  return res.status(404).json(
    buildErrorLog(req, 404, "Not found", "Service or endpoint does not exist")
  );
});

app.use((err, req, res, next) => {
  console.error(err);

  return res.status(500).json(
    buildErrorLog(
      req,
      500,
      "Internal server error",
      err?.message || "Unexpected error"
    )
  );
});


module.exports = app;
