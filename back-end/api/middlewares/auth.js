const AuthSession = require('../../../models/AuthSession');

module.exports = async (req, res, next) => {
    try {
        // Get the token from the custom header
        const token = req.headers['x-observatory-auth'];

        // If no token, kick them out immediately
        if (!token) {
            return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: "Authentication required",
                debuginfo: "No token provided in x-observatory-auth header"
            });
        }

        //  AuthSession's .validateToken() method:
        // - Checks if token exists
        // - Checks if isActive is true
        // - Checks if expired
        // - Updates the 'lastActivityAt' time (touches the session)
        const session = await AuthSession.validateToken(token);

        if (!session) {
            return res.status(400).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: "Invalid or expired token",
                debuginfo: "Token not found or session expired"
            });
        }

        // ATTACH THE USER TO THE REQUEST
        // We attach the whole user object (because we used .populate() in the model)
        req.user = session.userId; 
        req.token = token; // Keep the token handy just in case

        // Allow them to proceed to the controller
        next();

    } catch (error) {
        console.error("Auth Middleware Error:", error);
        return res.status(500).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            return_code: 500,
            error: "Internal Server Error during authentication"
        });
    }
};