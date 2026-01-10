// --- LOGOUT ---

const AuthSession = require('../../../../models/AuthSession');

exports.logout = async (req, res) => {
    try {
        // Get Token from Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: "Missing Authentication Token",
                debuginfo: "Authorization header with Bearer token is missing"
            });
        }

        // Invalidate Token in Database
        // We set 'is_valid' to false instead of deleting it, so we keep a history log.
        const result = await AuthSession.updateOne(
            { token_id: token },
            { is_valid: false }
        );

        if (result.matchedCount === 0) {
            return res.status(401).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 401,
                error: "Invalid or expired token",
                debuginfo: "Token not found in database"
            });
        }

        console.log(`🚪 User logged out successfully. Token invalidated: ${token.substring(0, 10)}...`);

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