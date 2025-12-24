// FILE: back-end/api/routes/admin.js

const express = require('express');
const router = express.Router();

// Import admin's controllers
const adminController = require('../controllers/admin-controllers/healthcheckController');

// Define the path
router.get('/admin/healthcheck', adminController.healthcheck);

module.exports = router;