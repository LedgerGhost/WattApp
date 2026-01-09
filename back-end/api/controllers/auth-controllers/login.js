// FILE: back-end/api/controllers/auth-controllers/login.js
const User = require('../../../../models/User');
const AuthSession = require('../../../../models/AuthSession'); // Import the session model

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // This handles findByEmail AND comparePassword internally.
        const user = await User.authenticate(email, password);

        // Check if authentication failed
        if (!user) {
            return res.status(400).json({ 
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: `Invalid email or password`,
                debuginfo: `format: ${req.query.format || 'json'}` 
            });
        }

        // This generates a random token and saves it to MongoDB
        const session = await AuthSession.createSession(user._id, {
            userAgent: req.get('User-Agent'), // Tracks if they are on Chrome/Mobile
            ipAddress: req.ip                 // Tracks their IP
        });

        console.log(`🔑 User logged in: ${user.email} | Session Token: ${session.token}`);
        await user.updateLastLogin();

        // Return the Opaque Token
        return res.status(200).json({
            status: "OK",
            message: "Login successful",
            token: session.token_id,
            email: user.email
        });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 500,
            error: "Internal Server Error",
            debuginfo: error.message
        });
    }
};