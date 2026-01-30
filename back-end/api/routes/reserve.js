//c

const express = require("express");
const router = express.Router();
const reserveController = require("../controllers/reserveController");
const UserReserveController = require("../controllers/UserReserveController");
const checkAuth = require('../middlewares/auth'); // Auth Middleware


// /api/reserve/:id(/:minutes)
router.post("/reserve/:id/:minutes?", checkAuth, reserveController.reservePoint);

// /api/USERreserve/:id(/:minutes)
router.post("/USERreserve/:id/:minutes?", checkAuth, UserReserveController.reservePoint);

module.exports = router;
