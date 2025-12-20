//d

const express = require("express");
const router = express.Router();
const updpointController = require("../controllers/updpointController");

// POST /api/updpoint/:id
router.post("/updpoint/:id", updpointController.updatePoint);

module.exports = router;
