//d

const express = require("express");
const router = express.Router();
const updpointController = require("../controllers/updpointController");
const checkAuth = require('../middlewares/auth'); // Auth Middleware


// POST /api/updpoint/:id
router.post("/updpoint/:id", checkAuth, updpointController.updatePoint);

module.exports = router;
