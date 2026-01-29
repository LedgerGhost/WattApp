const express = require("express");
const router = express.Router();
const navigateController = require("../controllers/navigateController");

// GET /api/navigate/:pointId
router.get("/navigate/:pointId", navigateController.navigateToPoint);

module.exports = router;
