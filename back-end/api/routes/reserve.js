//c

const express = require("express");
const router = express.Router();
const reserveController = require("../controllers/reserveController");
const checkAuth = require('../middlewares/auth'); // Auth Middleware


// /api/reserve/:id(/:minutes)
router.post("/reserve/:id/:minutes?", checkAuth, reserveController.reservePoint);

module.exports = router;
