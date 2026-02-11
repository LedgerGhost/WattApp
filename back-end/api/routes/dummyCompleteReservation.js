const express = require("express");
const router = express.Router();

const dummyCompleteReservationController = require("../controllers/dummyCompleteReservationController");
const checkAuth = require("../middlewares/auth");

// GET /api/myreservations
router.get("/:id", checkAuth, dummyCompleteReservationController.dummyCompleteReservation);

module.exports = router;

