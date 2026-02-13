**Run the Cli Testing**
```bash
 go test -v -count=1 -timeout 120s
 ```
In order to test the cli you must provided an admin active token

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION — override via environment variables:
//
//   ADMIN_TOKEN   (required)  admin API token
//   CLI_CMD       (optional)  CLI binary name          default: se2537
//   BASE_URL      (optional)  API base URL             default: https://localhost:9876/api
//   TOKEN_FILE    (optional)  token filename           default: .softeng_token
//
// Example:
//   set ADMIN_TOKEN=ed50e4a...  &&  go test -v -count=1 -timeout 120s
// ═══════════════════════════════════════════════════════════════════════════════ 
