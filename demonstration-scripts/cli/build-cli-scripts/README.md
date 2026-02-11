# WattApp CLI Test Suite — Source & Build

Full source code and build tooling for the WattApp CLI test suite.

## File Structure

```
build-cli-tests/
├── main.go              # Test orchestrator (24 test steps)
├── types.go             # Response structures with JSON tags
├── parsers.go           # JSON/CSV auto-detection & parsing
├── validators.go        # Validation logic (mirrors Postman)
├── api.go               # Direct HTTP calls (signup only)
├── go.mod               # Go module definition
├── addpoints.csv        # Test fixture data (4 points)
├── build-cli-test.ps1   # Cross-platform build script
└── README.md            # This file
```

## Building

### Prerequisites

- Go 1.21 or later (`go version`)

### Build All Platforms

```powershell
cd build-cli-tests
.\build-cli-test.ps1
```

This outputs executables and test data to the parent `CLI-TEST/` folder:

```
CLI-TEST/
├── cli-test.exe              ← Windows
├── cli-test-macos-intel      ← macOS Intel
├── cli-test-macos-arm        ← macOS Apple Silicon
├── cli-test-linux            ← Linux
├── addpoints.csv             ← Copied automatically
└── build-cli-tests/          ← Source (this folder)
```

### Manual Build (Single Platform)

```bash
cd build-cli-tests
go build -o ../cli-test.exe .
cp addpoints.csv ../
```

## Architecture

The program is split into 4 layers:

**`types.go`** — Data models. Every API response has a matching Go struct with `json:"..."` tags. These are the foundation everything else builds on.

**`parsers.go`** — Deserialization. Takes raw CLI output and converts it to typed structs. Every parser auto-detects JSON vs CSV by checking if the string starts with `{` or `[`.

**`validators.go`** — Assertions. Pure validation functions matching the Postman collection exactly: coordinate ranges, status enums, SOC bounds, timestamp proximity, ISO 8601 format checks.

**`main.go`** — Orchestrator. Contains `runTestSequence()` which calls all 24 tests in order, plus helpers for CLI execution, admin token swapping, and user interaction.

**`api.go`** — HTTP client. Only used for signup (the CLI doesn't support it). Makes a direct POST to the API with TLS skip verify.

## Test Flow

Each test function follows the same pattern:

```
stepHeader("Test Name")
    ↓
[useAdminToken() if admin op]     ← swap .softeng_token
    ↓
runCLI("command", "--flags")      ← execute se2537, capture stdout
    ↓
parse*(output)                    ← JSON/CSV → typed struct
    ↓
validate*(struct)                 ← Postman-equivalent assertions
    ↓
passTest("message") / failTest()  ← ✅ or ❌ + exit(1)
    ↓
waitForUser()                     ← pause until Enter
```

## Token Management

The CLI reads its auth token from `.softeng_token`. The test suite needs both user and admin tokens:

```
Login → .softeng_token = user_token

testResetpoints() {
    restore := useAdminToken()    // writes admin_token to file
    defer restore()               // restores user_token when done
    runCLI("resetpoints")         // CLI reads admin_token
}
```

Admin token is used for: `healthcheck`, `resetpoints`, `addpoints`.
User token is used for: everything else (reserve, sessions, points, etc.).

The `.softeng_token` file is created at runtime by the CLI login command — it should not be committed to source control.

## CLI Commands Reference

```bash
# Authentication
se2537 login --email <email> --passw <password>
se2537 logout

# Admin
se2537 healthcheck
se2537 resetpoints
se2537 addpoints --source <file>

# Points
se2537 points --status <status>
se2537 point --id <id>
se2537 updpoint --id <id> --status <status>

# Reservations
se2537 reserve --id <id> [--minutes <min>]

# Sessions
se2537 newsession --id <id> --starttime <time> --endtime <time> \
                  --startsoc <soc> --endsoc <soc> \
                  --totalkwh <kwh> --kwhprice <price> --amount <amt>
se2537 sessions --id <id> --from <date> --to <date>
se2537 pointstatus --id <id> --from <date> --to <date>
```

## Validation Details

All checks mirror the Postman collection's `sharedUtils`:

### Points (`validatePoint`)
- Point ID ≥ 0
- Latitude ∈ [-90, 90], Longitude ∈ [-180, 180]
- Status ∈ {available, charging, reserved, malfunction, offline}
- Capacity ≥ 0, Price ≥ 0

### Sessions (`validateSession`)
- StartTime / EndTime are non-empty strings
- StartSOC, EndSOC ∈ [0, 100]
- TotalKwh, KwhPrice, Amount ≥ 0

### History (`validateHistory`)
- Timeref, OldState, NewState are non-empty
- Both states ∈ {available, charging, reserved, malfunction, offline}

### Timestamps
- `isValidDateTimeFormat` — matches `YYYY-MM-DD HH:MM`
- `isValidISO8601` — matches `YYYY-MM-DDTHH:MM:SS(.sss)?Z`
- `isTimestampCloseToNow` — within 1 minute of local time
- `isTimestampCloseToNowISO` — within N seconds of UTC

## Expected Counts

```
After resetpoints:  2465 total points
After addpoints:    2469 total points

Status distribution:
  Available:   2447
  Charging:    4
  Reserved:    7  (after reservations)
  Malfunction: 0
  Offline:     5
```

## Test Data (Hardcoded)

```go
S1      = "2026-11-02 23:00"   // Session 1 start
E1      = "2026-11-03 07:00"   // Session 1 end
S2      = "2026-11-04 22:00"   // Session 2 start
E2      = "2026-11-04 08:00"   // Session 2 end

S1_DATE = "20261102"           // Date format for queries
S2_DATE = "20261104"
E1_DATE = "20261104"
E2_DATE = "20261105"
```

## Variable X (FirstNonReservedPointId)

Selected dynamically from available points in step 7. Used throughout steps 10–24. Stored as a global variable `PointX`.

## Customization

### CLI Binary Path

Edit `runCLI()` in `main.go`:

```go
func runCLI(args ...string) (string, error) {
    cmd := exec.Command(`..\..\cli-client\release\se2537.exe`, args...)
    // Change the path above to match your setup
```

### Expected Counts

Edit the `StatusCounts` structs in each test function:

```go
expectedCounts := StatusCounts{
    Available:   2447,  // ← adjust these
    Charging:    4,
    Reserved:    0,
    Malfunction: 0,
    Offline:     5,
}
```

### Adding New Tests

1. Create a test function in `main.go`
2. Add it to `runTestSequence()`
3. Add parsers in `parsers.go` if needed
4. Add validators in `validators.go` if needed

## Key Differences from Postman

| Aspect | Postman | CLI Test Suite |
|--------|---------|----------------|
| Signup | API call | API call (same) |
| Format | JSON primary, CSV check | CSV default, JSON auto-detected |
| Pause | N/A (runs continuously) | Press Enter between tests |
| Point X | Collection variable | Go global variable |
| Token | Header injection | File-based (`.softeng_token`) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `se2537: command not found` | Add CLI binary to your PATH |
| `Resetpoints failed: exit status 1` | Check admin token is valid |
| `addpoints.csv not found` | Ensure it's next to the executable |
| Timestamp close-to-now fails | Timezone mismatch — check system clock |
| `Failed to parse CSV/JSON` | Check raw CLI output printed above the error |
| Build errors | Run `go clean` then `go mod tidy` |
| Token file issues | `.softeng_token` is created by login — check backend |

## License

Internal use — Software Engineering 2025-2026 course (NTUA ECE).