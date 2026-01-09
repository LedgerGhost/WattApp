const express = require("express");
const router = express.Router();

const { getPointsinfo } = require("../controllers/pointsinfoController");

router.get("/pointsinfo", getPointsinfo);

module.exports = router;
