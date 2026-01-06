// FILE: back-end/api/routes/auth.js

const express = require('express');
const router = express.Router();

// Import the new controller
const { login }  = require('../controllers/auth-controllers/login');
const { signup } = require('../controllers/auth-controllers/signup'); 

///const { login } = require('../controllers/auth-controllers/login');
///const { signup } = require('../controllers/auth-controllers/signup'); //maybe this works?

// Define Routes
// Matches: POST /evcharge/api/auth/signup
router.post('/signup', signup);

// Matches: POST /evcharge/api/auth/login
router.post('/login', login);

module.exports = router;