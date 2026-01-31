# WattApp API Automation Tests

**Testing Strategy;** the API is rigorously tested using Postman and Newman for automation. The test suite covers all core endpoints including Authentication, EV Point management, and Sessions. It includes functional validation, negative testing (edge cases, invalid formats), and file upload scenarios (CSV parsing) in order to simulate real-world usage scenarios. Automated execution is handled via Newman CLI to ensure CI/CD compatibility. Key testing features include:

- End-to-End Workflows: Sequential testing of Signup -> Login -> Token generation -> Protected Resource access.
- Dynamic Edge Cases: Automated loops to validate error handling for invalid dates, formats, and query parameters (400 Bad Request).


This directory contains the Postman collection and file required to test the WattApp API automatically using **Newman**.

## 📋 Prerequisites

- **Node.js**: Ensure Node.js is installed on your machine.
- **Newman**: The command-line test runner for Postman.
    ```bash
    npm install -g newman
    ```
    (you can skip this step by using npx, see Run the Tests section below)

- **Obtain Admin Token before running the tests:**
    1. Log in to the application as an admin.
    2. Copy the access token.
    3. Open API-TEST.json (or set the variable via command line) and paste it into the admintoken variable.
    ```bash
    newman run API-TEST.json --env-var admintoken=YOUR_ACTUAL_TOKEN_HERE ...
    ```

## 📂 Project Structure

Ensure your test folder looks like this before running:

```text
/test
  ├── API-TEST.json                 # The exported Postman 
  ├── addpoints.csv                 # REQUIRED: Local data file
  ├── addpointsmissingcolumns.csv   # Edge case: Missing columns
  ├── addpointsmissingpointid.csv   # Edge case: Missing IDs
  ├── addpointswronglat.csv         # Edge case: Invalid coordinates
  ├── addpointswrongtestfile.docx   # Edge case: Invalid file type
  └── README.md                     # This documentation
```

## 🚀 Run the Tests

⚠️ Critical: You must run this command from **INSIDE** the ```/test``` directory so that Newman can find the local CSV files.


```bash
npx newman run API-TEST.json --insecure --env-var baseUrl=https://yourlocalhost:xxxx/api --env-var admintoken=YOUR_TOKEN_HERE
```
**Breakdown of Flags:**

- --insecure: Bypasses self-signed SSL certificate errors (required for localhost https).

- --env-var baseUrl=...: Sets the API URL (change port if needed).

- --env-var admintoken=...: Injects the admin token dynamicall