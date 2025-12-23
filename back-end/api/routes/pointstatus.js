// FILE: back-end/api/routes/pointStatus.js

const express = require('express');
const router = express.Router();

const pointStatusController = require('../controllers/pointstatusController');

// Define the path
router.get('/point-status/:pointid/:from/:to', pointStatusController.getPointStatusHistory);

module.exports = router;

