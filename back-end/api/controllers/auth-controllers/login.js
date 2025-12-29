// FILE: back-end/api/controllers/auth-controllers/login.js

// Import the users array
const { users } = require("../../utils/database");

// --- LOGIN ---
exports.login = async (req, res) => {
    try {
        // Get input
        const  email  = req.body.email;
        const  password  = req.body.password;
    
        if (email == null) {
            return res.status(400).json({
                isAuth : false, message : 'Auth failed, email field is required'
            });
        } 

        if (password == null) {
            return res.status(400).json({
                isAuth : false, message : 'Auth failed, password field is required'
            });
        }

        // Find the user
        const user = users.find(u => u.email === email);

        // Check if user exists AND password matches
        // (We check both at once for security, to not reveal if a email exists)
        if (!user || user.password !== password) {
            // 401 Unauthorized
            return res.status(401).json({ error: "Invalid email or password." });
        }

        console.log(`🔑 User logged in: ${email}`);

        // Return success & a mock token
        // In a real app, you would generate a JWT token here.
        return res.status(200).json({
            status: "OK",
            message: "Login successful",
            // Sending a fake token for now just to show the structure
            token: `mock_token_for_${user.id}_${Date.now()}`, 
            email: user.email
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: "Internal Server Error during login." });
    }
};