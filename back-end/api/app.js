const express = require('express');
const cors = require('cors');

/* Import routes */

const app = express();
app.use(cors());

app.use(express.json());




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

// Admin route:
app.use('/api', require("./routes/admin"));

app.use((req, res) => { res.status(404).json({ message: "Νot found" }) });

module.exports = app;
