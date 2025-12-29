// FILE: back-end/api/controllers/auth-controllers/signup.js

// Import the users array
const { users } = require("../../utils/database");

// --- SIGN UP (Register) ---
exports.signup = async (req, res) => {
    try {
        // Get input from the request body (JSON)
        const  fullName  = req.body.fullName;
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

        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(409).json({ error: "email already exists." });
        }

        // Create the new user
        const newUser = {
            id: users.length + 1, // Simple ID generation
            fullName: fullName,
            email: email,
            password: password // WARNING: Security issue!!!.
        };

        // Save to mock DB
        users.push(newUser);

        console.log(`✅ New user registered: ${email}`);

        // Return success (201 Created)
        return res.status(201).json({
            status: "OK",
            message: "User registered successfully",
            userId: newUser.id
        });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ error: "Internal Server Error during signup." });
    }
};
