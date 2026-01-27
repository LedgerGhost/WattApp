const express = require("express");
const router = express.Router();

const { getMyReservations } = require("../controllers/myReservationsController");

// GET /api/myreservations
router.get("/myreservations", getMyReservations);

module.exports = router;

