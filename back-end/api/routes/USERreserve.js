const express = require("express");
const router = express.Router();
const UserReserveController = require("../controllers/UserReserveController");
const checkAuth = require('../middlewares/auth'); // Auth Middleware

// /api/USERreserve/:id(/:minutes)
// router.post("/:id/:minutes?", checkAuth, UserReserveController.reservePoint);

// /api/USERreserve/:id(/:minutes)
router.post("/:id/", checkAuth, UserReserveController.reservePoint);
router.post("/:id/:minutes", checkAuth, UserReserveController.reservePoint);

module.exports = router;