const User = require('../../../../models/User');
const bcrypt = require('bcrypt');

// --- SIGN UP (Modified for Full Name) ---
exports.signup = async (req, res) => {
    try {
        // Accept 'fullName' instead of separate fields
        const { fullName, email, password, phone } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ 
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: "Missing required fields",
                debuginfo: "Required: email, password, fullName"            
            });
        }

        // Split Name Logic
        // We split by spaces. 
        // Example: "John Von Neumann" -> First: "John", Last: "Von Neumann"
        const nameParts = fullName.trim().split(/\s+/); // Split by any whitespace

        if (nameParts.length < 2) {
            return res.status(400).json({ 
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: "Invalid name format",
                debuginfo: "Please provide your fullName (First and Last name)"           
            });
        }

        const first_name = nameParts[0];
        // Join the rest of the array back together to form the last name
        const last_name = nameParts.slice(1).join(' '); 

        // Check if Email exists
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({ 
                call: req.originalUrl,
                timeref: new Date().toISOString(),
                originator: req.ip,
                return_code: 400,
                error: "Email already in use",
                debuginfo: `Email ${email} is already registered`             });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User
        const newUser = new User({
            first_name,  // Derived from fullName
            last_name,   // Derived from fullName
            email,
            phone,
            password_hash: hashedPassword,
            role: 'user',
            status: 'active'
        });

        await newUser.save();

        console.log(`✅ New User Registered: ${first_name} ${last_name}`);

        return res.status(200).json({ 
            status: "OK",
            message: "User created successfully",
            userId: newUser._id 
        });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ 
            call: req.originalUrl,
            timeref: new Date().toISOString(),
            originator: req.ip,
            return_code: 500,
            error: "Internal Server Error",
            debuginfo: error.message || "Signup failed"
        });
    }
};