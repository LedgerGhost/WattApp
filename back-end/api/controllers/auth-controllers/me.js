// FILE: back-end/api/controllers/auth-controllers/me.js
const User = require('../../../../models/User');
const AuthSession = require('../../../../models/AuthSession');

exports.me = async (req, res) => {
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 401,
                error: 'No authentication token provided',
            });
        }

        // Find session by token
        const session = await AuthSession.findOne({ token });
        
        if (!session) {
            return res.status(401).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 401,
                error: 'Invalid or expired token',
            });
        }

        // Find user by session
        const user = await User.findById(session.userId);
        
        if (!user) {
            return res.status(404).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 404,
                error: 'User not found',
            });
        }

        // Return user (toJSON method hides password_hash)
        return res.status(200).json({
            status: "OK",
            ...user.toJSON()
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
