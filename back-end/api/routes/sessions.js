//e

const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");

// POST /api/newsession
router.post("/newsession", sessionController.newSession);

// GET /api/sessions/:id/:from/:to
router.get("/sessions/:id/:from/:to", sessionController.getSessions);


module.exports = router;
