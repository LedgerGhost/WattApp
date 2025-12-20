//b

const express = require("express");
const router = express.Router();
const pointController = require("../controllers/pointController");

// GET /api/point/:id
router.get("/point/:id", pointController.getPointById);

module.exports = router;
