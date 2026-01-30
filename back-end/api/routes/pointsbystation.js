const express = require("express");
const router = express.Router();
const UserReserveController = require("../controllers/pointsbystationController");

// Define route: GET /api/points/nearby?lat=...&lon=...&radius=...
router.get('/:lon/:lat/:radius?', UserReserveController.getPointsByRadius);

module.exports = router;