//a
const express = require("express");
const router = express.Router();

const pointsController = require("../controllers/pointsController");

// Όταν γίνει GET /api/points -> τρέχει η getPoints
router.get("/points", pointsController.getPoints);

module.exports = router;
