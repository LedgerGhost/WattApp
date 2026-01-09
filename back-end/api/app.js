const express = require('express');
const cors = require('cors');

/* Import routes */

const app = express();
app.use(cors());

app.use(express.json());


const { buildErrorLog } = require("./utils/errorLog");

const mockAuth = require("./middlewares/mockauth");
app.use("/api", mockAuth);//testing




const reservationLogger = require("./middlewares/reservationLogger");
app.use("/api", reservationLogger); //store reserv

/* Routes used */
app.use("/api/auth",require("./routes/auth")); //for signup/login
app.use("/api/admin",require("./routes/admin"));
app.use("/api",require("./routes/points")); //a
app.use("/api",require("./routes/sessions")); //e
app.use("/api", require("./routes/point")); //b
app.use("/api", require("./routes/reserve")); //c
app.use("/api", require("./routes/updpoint"));//d
app.use("/api/pointstatus", require("./routes/pointstatus")); //g
app.use("/api", require("./routes/activeres"));
app.use("/api", require("./routes/navigate"));
app.use("/api", require ("./routes/pointsinfo"));

// Admin route:
// app.use('/api', require("./routes/admin"));

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
