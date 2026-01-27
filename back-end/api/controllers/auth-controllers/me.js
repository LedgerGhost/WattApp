// FILE: back-end/api/controllers/auth-controllers/me.js
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

        // Validate session by token using AuthSession helper
        const session = await AuthSession.validateToken(token);

        if (!session || !session.user_id) {
            return res.status(401).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 401,
                error: 'Invalid or expired token',
            });
        }

        // session.user_id is already populated in validateToken()
        const user = session.user_id;

        // Return user (User.toJSON hides password_hash)
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
