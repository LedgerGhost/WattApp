// FILE: back-end/api/routes/admin.js

const express = require('express');
const router = express.Router();

// Import admin's controllers
const healthcheckController = require('../controllers/admin-controllers/healthcheckController');
const resetPointsController = require('../controllers/admin-controllers/resetpointsController');
const adminController = require('../controllers/admin-controllers/addpointsController');
const multer = require('multer'); // Middleware for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Define the path
router.get('/healthcheck', healthcheckController.healthcheck);
router.post('/resetpoints', resetPointsController.resetPoints);
router.post('/addpoints', upload.single('source'), adminController.addPoints);


module.exports = router;