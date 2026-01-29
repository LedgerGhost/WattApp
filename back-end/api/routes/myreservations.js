const express = require("express");
const router = express.Router();

const { getMyReservations } = require("../controllers/myReservationsController");
const checkAuth = require("../middlewares/auth");

// GET /api/myreservations
router.get("/myreservations", checkAuth, getMyReservations);

module.exports = router;

