// FILE: back-end/api/routes/auth.js

const express = require('express');
const router = express.Router();

// Import the new controller
const { login }  = require('../controllers/auth-controllers/login');
const { signup } = require('../controllers/auth-controllers/signup'); 
const { logout } = require('../controllers/auth-controllers/logout');
const { me } = require('../controllers/auth-controllers/me');

///const { login } = require('../controllers/auth-controllers/login');
///const { signup } = require('../controllers/auth-controllers/signup'); //maybe this works?

// Define Routes
// Matches: POST /api/auth/signup
router.post('/signup', signup);

// Matches: POST /api/auth/login
router.post('/login', login);

// Matches: POST /api/auth/logout
router.post('/logout', logout);

// Matches: GET /api/auth/me
router.get('/me', me);

module.exports = router;