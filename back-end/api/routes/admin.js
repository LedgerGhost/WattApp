// FILE: back-end/api/routes/admin.js

const express = require('express');
const router = express.Router();
const checkAuth = require('../middlewares/auth'); // Auth Middleware
const checkAdmin = require('../middlewares/admin'); // Admin Middleware

// Import admin's controllers
const healthcheckController = require('../controllers/admin-controllers/healthcheckController');
const resetPointsController = require('../controllers/admin-controllers/resetpointsController');
const adminController = require('../controllers/admin-controllers/addpointsController');
const multer = require('multer'); // Middleware for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Define the path
router.get('/healthcheck', healthcheckController.healthcheck);
router.post('/resetpoints', checkAuth, checkAdmin, resetPointsController.resetPoints);
router.post('/addpoints', checkAuth, checkAdmin, upload.single('source'), adminController.addPoints);


module.exports = router;