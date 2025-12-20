//show the active reservation of auhthenticated user

const express = require("express");
const router = express.Router();
const activeresController = require("../controllers/activeresController");

// GET /api/reservation/active
router.get("/reservation/active", activeresController.getActiveReservation);

// POST /api/reservation/cancel (no id cause user only has one active res)
router.post("/reservation/cancel", activeresController.cancelReservation);

module.exports = router;
