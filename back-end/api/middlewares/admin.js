module.exports = (req, res, next) => {
    try {
        // Safety Check: Did checkAuth run?
        if (!req.user) {
            return res.status(500).json({
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                return_code: 500,
                error: "Internal Error",
                debuginfo: "Auth middleware must be used before Admin middleware"
            });
        }

        // Check the Role: req.user.role === 'admin'
        if (req.user.role !== 'admin') {
            return res.status(403).json({ // 403 means "Forbidden" (You are logged in, but not allowed here)
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 403,
                error: "Access Denied",
                debuginfo: "User is not an administrator"
            });
        }

        // User is Admin -> Proceed
        next();

    } catch (error) {
        console.error("Admin Middleware Error:", error);
        return res.status(500).json({
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            return_code: 500,
            error: "Internal Server Error"
        });
    }
};