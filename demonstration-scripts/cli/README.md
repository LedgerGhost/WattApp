# WattApp CLI Test Suite

Automated test suite for the WattApp EV Charging CLI (`se2537`), mirroring the Postman test collection logic.

## Prerequisites

- `se2537` CLI binary in your PATH
- Backend running at `https://localhost:9876/api`
- Admin authentication token
- `addpoints.csv` in the same directory as the executable

## Quick Start

### Windows
```powershell
.\cli-test.exe
```

### macOS
```bash
# Apple Silicon (M1/M2/M3/M4)
chmod +x cli-test-macos-arm
./cli-test-macos-arm

# Intel
chmod +x cli-test-macos-intel
./cli-test-macos-intel
```

### Linux
```bash
chmod +x cli-test-linux
./cli-test-linux
```

### When Prompted
```
Enter Admin Token: ed50e4a75f9bdc85d9fc90ae5e207455d7d53103d21c387c29eb49392633f6c1
```

The suite runs all 24 tests in sequence, pausing after each one for review.

## Test Sequence

```
 1. Signup                  → Create random user via API
 2. Login                   → Authenticate with CLI
 3. Healthcheck v1          → Verify system health
 4. Resetpoints             → Initialize database (2465 points)
 5. Addpoints               → Import 4 new points from CSV
 6. Healthcheck v2          → Verify 2469 total points
 7. Points Available        → List available points (2447), pick Point X
 8. Points Charging         → List charging points (4)
 9. Points Offline          → List offline points (5)
10. Point X v1              → Get details of Point X
11. Reserve Default v1      → Reserve Point X (30 min)
12. Points Reserved v1      → Verify 7 reserved points
13. Point X Reserved        → Confirm X is reserved
14. Updpoint Available      → Update X to available
15. Point X v2              → Verify X is available
16. Reserve Default v2      → Reserve X again
17. Points Reserved v2      → Verify 7 reserved points
18. Newsession 1            → S1→E1 (15kWh, €7.5)
19. Pointstatus v1          → Status changes S1→E1
20. Point X v3              → Current state
21. Newsession 2            → S2→E2 (20kWh, €12)
22. Get Sessions            → List all sessions
23. Pointstatus v2          → Status changes S2→E2
24. Logout                  → End session
```

## Files

| File | Description |
|------|-------------|
| `cli-test.exe` | Windows executable |
| `cli-test-macos-intel` | macOS Intel executable |
| `cli-test-macos-arm` | macOS Apple Silicon executable |
| `cli-test-linux` | Linux executable |
| `addpoints.csv` | Test data (4 charging points) |
| `build-cli-tests/` | Source code and build script |

## Exit Codes

- `0` — All tests passed
- `1` — Test failed (immediate exit with details)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `se2537: command not found` | Add CLI binary to your PATH |
| `Resetpoints failed` | Check backend is running and admin token is valid |
| `addpoints.csv not found` | Ensure it's in the same directory as the executable |
| Timestamp mismatch errors | Check your system clock matches the server timezone |
| `Failed to read token file` | Login failed — check backend connectivity |

## Building from Source

See `build-cli-tests/README.md` for full documentation. To rebuild all platforms:

```powershell
cd build-cli-tests
.\build-cli-test.ps1
```

## Exercise Requirement

> "Διαμορφώστε το script σας και τα απαιτούμενα λοιπά αρχεία ώστε να κάνει
> ακριβώς τα παραπάνω. Σε κάθε βήμα πρέπει να διακόπτεται η εκτέλεση μέχρις
> ότου πατηθεί κάποιο πλήκτρο."

✅ Exact test sequence from specification
✅ Pause after each step
✅ Uses se2537 binary
✅ Includes signup/login/logout
✅ Validates like Postman tests

## License

Internal use — Software Engineering 2025-2026 course (NTUA ECE).