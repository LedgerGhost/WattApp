//e

const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const checkAuth = require('../middlewares/auth'); // Auth Middleware


// POST /api/newsession
router.post("/newsession", checkAuth, sessionController.newSession);

// GET /api/sessions/:id/:from/:to
router.get("/sessions/:id/:from/:to", sessionController.getSessions);


module.exports = router;
