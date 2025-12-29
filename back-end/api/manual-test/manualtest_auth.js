// FILE: back-end/api/manual-test/manualtest_auth.js
const signup = require('../controllers/auth-controllers/signup');
const login = require('../controllers/auth-controllers/login');
const { users } = require('../utils/database');

// Helper Mock Response
const mockRes = (label) => ({
    status: (code) => { console.log(`\n[${label}] STATUS: ${code}`); return mockRes(label); },
    json: (data) => { console.log(`[${label}] BODY:`, data); }
});

const runAuthTest = async () => {
    console.log("🚀 STARTING AUTH TEST");
    console.log("Initial Users:", users.length);

    // 1. TEST SIGNUP
    console.log("\n--- Testing Sign Up ---");
    const signupReq = {
        body: { username: "newuser", password: "mypassword" }
    };
    await signup.signup(signupReq, mockRes("SIGNUP"));

    // 2. TEST LOGIN (Success)
    console.log("\n--- Testing Login (Correct credentials) ---");
    const loginReq = {
        body: { username: "newuser", password: "mypassword" }
    };
    await login.login(loginReq, mockRes("LOGIN_OK"));

    // 3. TEST LOGIN (Failure)
    console.log("\n--- Testing Login (Wrong password) ---");
    const badLoginReq = {
        body: { username: "newuser", password: "WRONG" }
    };
    await login.login(badLoginReq, mockRes("LOGIN_FAIL"));
};

runAuthTest();