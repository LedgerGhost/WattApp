**For api_scripting.json:**
```bash
npx newman run api-scripting.json --bail --insecure --env-var baseUrl=https://yourlocalhost:xxxx/api --env-var admintoken=YOUR_TOKEN_HERE
```
**Breakdown of Flags:**

- --bail: Stops the execution when a test fails (for debugging)
- --insecure: Bypasses self-signed SSL certificate errors (required for localhost https).

- --env-var baseUrl=...: Sets the API URL (change port if needed).

- --env-var admintoken=...: Injects the admin token dynamicall