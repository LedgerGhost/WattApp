//c

const express = require("express");
const router = express.Router();
const reserveController = require("../controllers/reserveController");

// /api/reserve/:id(/:minutes)
router.post("/reserve/:id/:minutes?", reserveController.reservePoint);

module.exports = router;
