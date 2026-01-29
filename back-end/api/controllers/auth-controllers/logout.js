// --- LOGOUT ---

const AuthSession = require('../../../../models/AuthSession');

exports.logout = async (req, res) => {
    try {
        // Get Token from Header
        const token_id = req.headers['x-observatory-auth'];

        if (!token_id) {
            return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: "Missing Authentication Token",
                debuginfo: "Header x-observatory-auth is missing"
            });
        }

        // Invalidate Token in Database
        // We set 'isActive' to false instead of deleting it, so we keep a history log.
        await AuthSession.updateOne(
            { token_id: token_id },
            { isActive: false }
        );

        // Success Response
        return res.status(200).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 200,
            status: "OK",
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 500,
            error: "Internal Server Error",
            debuginfo: error.message || "Logout failed"
        });
    }
};