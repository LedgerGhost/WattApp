package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"os"
	"os/exec"
	"strings"
	"time"
)

// Global configuration
var (
	BaseURL    = "https://localhost:9876/api"
	AdminToken string
	UserToken  string
	UserEmail  string
	UserPass   string
	PointX     int // The FirstNonReservedPointId
)

// Test dates from specification
const (
	S1      = "2026-11-02 23:00"
	S2      = "2026-11-04 22:00"
	E1      = "2026-11-03 07:00"
	E2      = "2026-11-05 08:00"
	S1_DATE = "20261102"
	S2_DATE = "20261104"
	E1_DATE = "20261103"
	E2_DATE = "20261105"
)

func main() {
	fmt.Println("╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║          WattApp CLI Test Suite - se2537                  ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
	fmt.Println()

	// Prompt for admin token
	fmt.Print("Enter Admin Token: ")
	reader := bufio.NewReader(os.Stdin)
	adminInput, _ := reader.ReadString('\n')
	AdminToken = strings.TrimSpace(adminInput)

	if AdminToken == "" {
		fmt.Println("❌ Admin token is required!")
		os.Exit(1)
	}

	// Initialize random seed
	rand.Seed(time.Now().UnixNano())

	// Run test sequence
	runTestSequence()

	fmt.Println()
	fmt.Println("╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║              All Tests Completed Successfully!            ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
}

func runTestSequence() {
	// Authentication Setup
	testSignup()
	testLogin()

	// Admin Operations (all use admin token, matching Postman's {{admintoken}})
	testHealthcheck("v1")
	testResetpoints()
	testAddpoints()
	testHealthcheck("v2")

	// Points Operations
	testPointsAvailable()
	testPointsCharging()
	testPointsOffline()
	testPointX("v1")

	// Reservations
	testReserveDefault("v1")
	testPointsReserved("v1")
	testPointXReserved()
	testUpdpointAvailable()
	testPointX("v2")
	testReserveDefault("v2")
	testPointsReserved("v2")

	// Sessions
	testNewsession1()
	testPointstatusHistory("v1")
	testPointX("v3")
	testNewsession2()
	testGetSessions()
	testPointstatusHistory("v2")

	// Cleanup
	testLogout()
}

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

func testSignup() {
	stepHeader("Signup - Create Random Test User")

	// Generate random email (matches Postman: test_${Date.now()}_${random}@example.com)
	timestamp := time.Now().UnixNano()
	randomStr := fmt.Sprintf("%d_%x", timestamp, rand.Intn(0xFFFFFF))
	UserEmail = fmt.Sprintf("test_%s@example.com", randomStr)
	UserPass = "StrongP@ssw0rd!"

	fmt.Printf("📧 Email: %s\n", UserEmail)
	fmt.Printf("🔑 Password: %s\n", UserPass)

	// Call API directly (CLI doesn't support signup)
	payload := map[string]string{
		"fullName": "Test User",
		"email":    UserEmail,
		"password": UserPass,
		"phone":    "+30123456789",
	}

	resp, err := callAPIPost("/auth/signup", payload, "")
	if err != nil {
		failTest("Signup API call failed: %v", err)
	}

	// Postman: pm.expect([200]).to.include(pm.response.code)
	if resp.StatusCode != 200 {
		failTest("Expected status 200, got %d", resp.StatusCode)
	}

	passTest("User created successfully")
	waitForUser()
}

func testLogin() {
	stepHeader("Login - Authenticate User")

	// Use CLI login command
	output, err := runCLI("login", "--email", UserEmail, "--passw", UserPass)
	if err != nil {
		fmt.Println(output)
		failTest("Login failed: %v", err)
	}

	fmt.Println(output)

	// Postman: pm.expect(j).to.have.property("token") and token is string and not empty
	tokenBytes, err := os.ReadFile(".softeng_token")
	if err != nil {
		failTest("Failed to read token file: %v", err)
	}

	UserToken = strings.TrimSpace(string(tokenBytes))

	if UserToken == "" {
		failTest("Token is empty after login")
	}

	passTest("Login successful, token saved")
	waitForUser()
}

// ============================================================================
// ADMIN TESTS
// ============================================================================

func testHealthcheck(version string) {
	stepHeader(fmt.Sprintf("Healthcheck [200-OK] %s", version))

	// Postman uses {{admintoken}} for healthcheck
	restore := useAdminToken()
	defer restore()

	output, err := runCLI("healthcheck")
	if err != nil {
		fmt.Println(output)
		failTest("Healthcheck failed: %v", err)
	}

	fmt.Println(output)

	// Parse JSON response
	var result HealthcheckResponse
	if err := json.Unmarshal([]byte(strings.TrimSpace(output)), &result); err != nil {
		failTest("Failed to parse JSON: %v", err)
	}

	// Postman v1 & v2: pm.expect([200]).to.include(pm.response.code) — checked by CLI exit code

	// Postman v1 & v2: pm.expect(pm.response.text()).to.include("27017/wattapp")
	if !strings.Contains(result.DBConnection, "27017/wattapp") {
		failTest("DB connection string doesn't match expected pattern")
	}

	// Postman v2 ONLY: pm.expect(data.n_charge_points).to.be.equal(AddedPoints + 2465)
	if version == "v2" {
		expectedPoints := 2469 // 2465 from resetpoints + 4 from addpoints
		if result.NChargePoints != expectedPoints {
			failTest("Expected %d total charge points, got %d", expectedPoints, result.NChargePoints)
		}
	}

	passTest(fmt.Sprintf("Health OK | DB: Connected | Points: %d (Online: %d, Offline: %d)",
		result.NChargePoints, result.NChargePointsOnline, result.NChargePointsOffline))
	waitForUser()
}

func testResetpoints() {
	stepHeader("Reset Points [200-OK]")

	// Postman uses {{admintoken}}
	restore := useAdminToken()
	defer restore()

	output, err := runCLI("resetpoints")
	if err != nil {
		fmt.Println(output)
		failTest("Resetpoints failed: %v", err)
	}

	fmt.Println(output)

	// Parse JSON response
	var result ResetpointsResponse
	if err := json.Unmarshal([]byte(strings.TrimSpace(output)), &result); err != nil {
		failTest("Failed to parse JSON: %v", err)
	}

	// Postman: pm.expect(reply.total_points_imported).to.eql(2465)
	if result.TotalPointsImported != 2465 {
		failTest("Expected 2465 points imported, got %d", result.TotalPointsImported)
	}

	// Postman: pm.expect(reply.source_file).to.eql("resetpointsdata.json")
	if result.SourceFile != "resetpointsdata.json" {
		failTest("Expected source file 'resetpointsdata.json', got '%s'", result.SourceFile)
	}

	passTest(fmt.Sprintf("Database reset | %d points imported from %s",
		result.TotalPointsImported, result.SourceFile))
	waitForUser()
}

func testAddpoints() {
	stepHeader("Add Points [200-OK]")

	// Postman uses {{admintoken}}
	restore := useAdminToken()
	defer restore()

	output, err := runCLI("addpoints", "--source", "addpoints.csv")
	if err != nil {
		fmt.Println(output)
		failTest("Addpoints failed: %v", err)
	}

	fmt.Println(output)

	// Parse JSON response
	var result AddpointsResponse
	if err := json.Unmarshal([]byte(strings.TrimSpace(output)), &result); err != nil {
		failTest("Failed to parse JSON: %v", err)
	}

	// Postman: pm.expect(data.status).to.include("OK")
	if !strings.Contains(result.Status, "OK") {
		failTest("Expected status containing 'OK', got '%s'", result.Status)
	}

	// Postman: pm.expect(data.info).to.include("successfully")
	if !strings.Contains(result.Info, "successfully") {
		failTest("Expected info containing 'successfully', got '%s'", result.Info)
	}

	// Postman: pm.expect(data.points_imported).to.equal(4)
	if result.PointsImported != 4 {
		failTest("Expected 4 points imported, got %d", result.PointsImported)
	}

	// Postman: Strict ISO Regex /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
	if !isValidISO8601(result.Timeref) {
		failTest("Invalid ISO 8601 timestamp: %s", result.Timeref)
	}

	// Postman: pm.expect(Math.abs(now.diff(serverTime, 'seconds'))).to.be.below(60)
	if !isTimestampCloseToNowISO(result.Timeref, 60) {
		failTest("Timeref '%s' is not within 60 seconds of current time", result.Timeref)
	}

	passTest(fmt.Sprintf("%d new points added successfully | Timeref: %s", result.PointsImported, result.Timeref))
	waitForUser()
}

// ============================================================================
// POINTS TESTS
// ============================================================================

func testPointsAvailable() {
	stepHeader("Points [200/204 - Available]")

	output, err := runCLI("points", "--status", "available")
	if err != nil {
		fmt.Println(output)
		failTest("Points query failed: %v", err)
	}

	fmt.Println(output)

	// Parse response (auto-detects JSON vs CSV)
	points := parseCSVPoints(output)

	// Postman: pm.expect(jsonData).to.be.an("array"); pm.expect(jsonData.length).to.be.above(0)
	if len(points) == 0 {
		failTest("No available points found")
	}

	// Postman: jsonData.forEach(p => validatePoint(p, false))
	for i, point := range points {
		validatePoint(point, true, fmt.Sprintf("Point %d", i+1))
	}

	// Postman: pm.expect(jsonCounts).to.eql({available: 2447, charging: 0, reserved: 0, malfunction: 0, offline: 0})
	counts := calculateStatusCounts(points)
	expectedCounts := StatusCounts{
		Available:   2447,
		Charging:    0,
		Reserved:    0,
		Malfunction: 0,
		Offline:     0,
	}

	if counts != expectedCounts {
		failTest("Status counts mismatch.\n  Expected: %s\n  Got:      %s", expectedCounts, counts)
	}

	// Postman: var FirstNonReservedPointId = jsonData.filter((point) => point.status == "available")
	// pm.collectionVariables.set("FirstNonReservedPointId", FirstNonReservedPointId[0].pointid)
	for _, point := range points {
		if point.Status == "available" {
			PointX = point.PointID
			break
		}
	}

	if PointX == 0 {
		failTest("Could not find an available point for testing")
	}

	passTest(fmt.Sprintf("Found %d available points | Using Point X = %d for tests", len(points), PointX))
	waitForUser()
}

func testPointsCharging() {
	stepHeader("Points [200/204 - Charging]")

	output, err := runCLI("points", "--status", "charging")
	if err != nil {
		fmt.Println(output)
		failTest("Points query failed: %v", err)
	}

	fmt.Println(output)

	// Parse response (auto-detects JSON vs CSV)
	points := parseCSVPoints(output)

	// Postman: jsonData.forEach(p => validatePoint(p, false))
	for i, point := range points {
		validatePoint(point, true, fmt.Sprintf("Point %d", i+1))
	}

	// Postman: pm.expect(jsonCounts).to.eql({available: 0, charging: 4, reserved: 0, malfunction: 0, offline: 0})
	counts := calculateStatusCounts(points)
	expectedCounts := StatusCounts{
		Available:   0,
		Charging:    4,
		Reserved:    0,
		Malfunction: 0,
		Offline:     0,
	}

	if counts != expectedCounts {
		failTest("Status counts mismatch.\n  Expected: %s\n  Got:      %s", expectedCounts, counts)
	}

	passTest(fmt.Sprintf("Found %d charging points", len(points)))
	waitForUser()
}

func testPointsOffline() {
	stepHeader("Points [200/204 - Offline]")

	output, err := runCLI("points", "--status", "offline")
	if err != nil {
		fmt.Println(output)
		failTest("Points query failed: %v", err)
	}

	fmt.Println(output)

	// Parse response (auto-detects JSON vs CSV)
	points := parseCSVPoints(output)

	// Postman: jsonData.forEach(p => validatePoint(p, false))
	for i, point := range points {
		validatePoint(point, true, fmt.Sprintf("Point %d", i+1))
	}

	// Postman: pm.expect(jsonCounts).to.eql({available: 0, charging: 0, reserved: 0, malfunction: 0, offline: 5})
	counts := calculateStatusCounts(points)
	expectedCounts := StatusCounts{
		Available:   0,
		Charging:    0,
		Reserved:    0,
		Malfunction: 0,
		Offline:     5,
	}

	if counts != expectedCounts {
		failTest("Status counts mismatch.\n  Expected: %s\n  Got:      %s", expectedCounts, counts)
	}

	passTest(fmt.Sprintf("Found %d offline points", len(points)))
	waitForUser()
}

func testPointX(version string) {
	stepHeader(fmt.Sprintf("Point [200 - Point %d] %s", PointX, version))

	output, err := runCLI("point", "--id", fmt.Sprintf("%d", PointX))
	if err != nil {
		fmt.Println(output)
		failTest("Point query failed: %v", err)
	}

	fmt.Println(output)

	// Parse response (auto-detects JSON vs CSV)
	point := parseCSVPointDetails(output)

	// Postman: pm.expect(data.pointid).to.equal(Number(requestedId))
	if point.PointID != PointX {
		failTest("Returned PointID %d doesn't match requested %d", point.PointID, PointX)
	}

	// Postman: validatePoint(data, isCsv=false, isproviderName=false)
	validatePointDetails(point, fmt.Sprintf("Point %d", PointX))

	// Postman: pm.expect(data).to.have.property("reservationendtime")
	// (guaranteed by struct parsing, but validate format)

	// Postman: Valid Date Format "YYYY-MM-DD HH:MM"
	if !isValidDateTimeFormat(point.ReservationEndTime) {
		failTest("Invalid reservation timestamp format: '%s' (expected YYYY-MM-DD HH:MM)", point.ReservationEndTime)
	}

	// Postman: For non-reserved points, time is close to current time (within 1 minute)
	// Postman: For reserved points, expiry time is valid
	if point.Status != "reserved" {
		if !isTimestampCloseToNow(point.ReservationEndTime) {
			failTest("For non-reserved point, timestamp should be close to current time (within 1 min)")
		}
	} else {
		reservationTime, err := time.ParseInLocation("2006-01-02 15:04", point.ReservationEndTime, time.Local)
		if err != nil {
			failTest("Failed to parse reservation time: %v", err)
		}
		if reservationTime.Before(time.Now()) {
			failTest("Reservation time should be in the future")
		}
	}

	passTest(fmt.Sprintf("Point %d | Status: %s | Cap: %d kW | Price: €%.2f/kWh",
		point.PointID, point.Status, point.Cap, point.KwhPrice))
	waitForUser()
}

// ============================================================================
// RESERVATION TESTS
// ============================================================================

func testReserveDefault(version string) {
	stepHeader(fmt.Sprintf("Reserve Point [200 - Default Min - Point %d] %s", PointX, version))

	output, err := runCLI("reserve", "--id", fmt.Sprintf("%d", PointX))
	if err != nil {
		fmt.Println(output)
		failTest("Reserve failed: %v", err)
	}

	fmt.Println(output)

	// Parse response (auto-detects JSON vs CSV)
	result := parseCSVReservation(output)

	// Postman: pm.expect(jsonData.pointid).to.be.a("number")
	// Postman: pm.expect(jsonData.pointid).to.eql(Number(requestedId))
	if result.PointID != PointX {
		failTest("Returned PointID %d doesn't match requested %d", result.PointID, PointX)
	}

	// Postman: pm.expect(jsonData.status).to.eql("reserved")
	if result.Status != "reserved" {
		failTest("Expected status 'reserved', got '%s'", result.Status)
	}

	// Postman: pm.expect(jsonData.reservationendtime).to.not.be.null
	if result.ReservationEndTime == "" {
		failTest("Reservation end time is empty")
	}

	// Postman: diff = abs(actualTime - expectedTime) < 2 minutes
	// where expectedTime = now + Defaultminutes (30)
	expectedTime := time.Now().Add(30 * time.Minute)
	actualTime, err := time.ParseInLocation("2006-01-02 15:04", result.ReservationEndTime, time.Local)
	if err != nil {
		failTest("Failed to parse reservation time: %v", err)
	}

	diffMinutes := math.Abs(actualTime.Sub(expectedTime).Minutes())
	if diffMinutes > 2 {
		failTest("Reservation time mismatch! Difference is %.2f minutes (max 2)", diffMinutes)
	}

	passTest(fmt.Sprintf("Point %d reserved until %s (default 30 min)",
		result.PointID, result.ReservationEndTime))
	waitForUser()
}

func testPointsReserved(version string) {
	stepHeader(fmt.Sprintf("Points [200/204 - Reserved] %s", version))

	output, err := runCLI("points", "--status", "reserved")
	if err != nil {
		fmt.Println(output)
		failTest("Points query failed: %v", err)
	}

	fmt.Println(output)

	// Parse response (auto-detects JSON vs CSV)
	points := parseCSVPoints(output)

	// Postman: jsonData.forEach(p => validatePoint(p, false))
	for i, point := range points {
		validatePoint(point, true, fmt.Sprintf("Point %d", i+1))
	}

	// Postman: pm.expect(jsonCounts).to.eql({available: 0, charging: 0, reserved: 7, malfunction: 0, offline: 0})
	counts := calculateStatusCounts(points)
	expectedCounts := StatusCounts{
		Available:   0,
		Charging:    0,
		Reserved:    7,
		Malfunction: 0,
		Offline:     0,
	}

	if counts != expectedCounts {
		failTest("Status counts mismatch.\n  Expected: %s\n  Got:      %s", expectedCounts, counts)
	}

	passTest(fmt.Sprintf("Found %d reserved points", len(points)))
	waitForUser()
}

func testPointXReserved() {
	stepHeader(fmt.Sprintf("Point [200 - Reserved Point %d]", PointX))

	output, err := runCLI("point", "--id", fmt.Sprintf("%d", PointX))
	if err != nil {
		fmt.Println(output)
		failTest("Point query failed: %v", err)
	}

	fmt.Println(output)

	// Parse response (auto-detects JSON vs CSV)
	point := parseCSVPointDetails(output)

	// Postman: pm.expect(data.pointid).to.equal(Number(requestedId))
	if point.PointID != PointX {
		failTest("Returned PointID %d doesn't match requested %d", point.PointID, PointX)
	}

	// Postman: validatePoint(data, isCsv=false, isproviderName=false)
	validatePointDetails(point, fmt.Sprintf("Point %d", PointX))

	// Postman: pm.expect(data.reservationendtime).to.match(dateFormatRegex)
	if !isValidDateTimeFormat(point.ReservationEndTime) {
		failTest("Invalid reservation timestamp format: '%s'", point.ReservationEndTime)
	}

	// Postman: pm.expect(data.status) — should be reserved here
	if point.Status != "reserved" {
		failTest("Expected status 'reserved', got '%s'", point.Status)
	}

	// Postman: For reserved point, expiry time is valid
	reservationTime, err := time.ParseInLocation("2006-01-02 15:04", point.ReservationEndTime, time.Local)
	if err != nil {
		failTest("Failed to parse reservation time: %v", err)
	}
	_ = reservationTime // Postman just checks isValid(), which parse already ensures

	passTest(fmt.Sprintf("Point %d confirmed reserved until %s",
		point.PointID, point.ReservationEndTime))
	waitForUser()
}

func testUpdpointAvailable() {
	stepHeader(fmt.Sprintf("Update Point [200-OK] - Point %d to Available", PointX))

	output, err := runCLI("updpoint", "--id", fmt.Sprintf("%d", PointX), "--status", "available")
	if err != nil {
		fmt.Println(output)
		failTest("Updpoint failed: %v", err)
	}

	fmt.Println(output)

	// Parse response (auto-detects JSON vs CSV)
	result := parseCSVUpdpoint(output)

	// Postman: pm.expect(j.pointid).to.equal(pm.collectionVariables.get("FirstNonReservedPointId"))
	if result.PointID != PointX {
		failTest("Returned PointID %d doesn't match requested %d", result.PointID, PointX)
	}

	// Postman: pm.expect(j.status).to.equal("available")
	if result.Status != "available" {
		failTest("Expected status 'available', got '%s'", result.Status)
	}

	// Postman: pm.expect(j.kwhprice).to.greaterThanOrEqual(0.0)
	if result.KwhPrice < 0 {
		failTest("Invalid kwhprice: %.2f (must be >= 0)", result.KwhPrice)
	}

	passTest(fmt.Sprintf("Point %d updated to available | Price: €%.2f/kWh",
		result.PointID, result.KwhPrice))
	waitForUser()
}

// ============================================================================
// SESSION TESTS
// ============================================================================

func testNewsession1() {
	stepHeader("New Session [200-OK] - Charging Session 1 (€7.5 / 15kWh)")

	output, err := runCLI("newsession",
		"--id", fmt.Sprintf("%d", PointX),
		"--starttime", S1,
		"--endtime", E1,
		"--startsoc", "10",
		"--endsoc", "30",
		"--totalkwh", "15",
		"--kwhprice", "0.5",
		"--amount", "7.5")
	if err != nil {
		fmt.Println(output)
		failTest("Newsession failed: %v", err)
	}

	fmt.Println(output)

	// Postman: pm.expect(pm.response.text()).to.be.empty
	trimmed := strings.TrimSpace(output)
	if trimmed != "" {
		failTest("Expected empty body, got: %s", output)
	}

	passTest("Charging session 1 recorded successfully")
	waitForUser()
}

func testNewsession2() {
	stepHeader("New Session [200-OK] - Charging Session 2 (€12 / 20kWh)")

	output, err := runCLI("newsession",
		"--id", fmt.Sprintf("%d", PointX),
		"--starttime", S2,
		"--endtime", E2,
		"--startsoc", "50",
		"--endsoc", "80",
		"--totalkwh", "20",
		"--kwhprice", "0.6",
		"--amount", "12")
	if err != nil {
		fmt.Println(output)
		failTest("Newsession failed: %v", err)
	}

	fmt.Println(output)

	// Postman: pm.expect(pm.response.text()).to.be.empty
	trimmed := strings.TrimSpace(output)
	if trimmed != "" {
		failTest("Expected empty body, got: %s", output)
	}

	passTest("Charging session 2 recorded successfully")
	waitForUser()
}

func testGetSessions() {
	stepHeader(fmt.Sprintf("Get Sessions [200 - Point %d from %s to %s]", PointX, S1_DATE, E2_DATE))

	output, err := runCLI("sessions",
		"--id", fmt.Sprintf("%d", PointX),
		"--from", S1_DATE,
		"--to", E2_DATE)
	if err != nil {
		fmt.Println(output)
		failTest("Sessions query failed: %v", err)
	}

	fmt.Println(output)

	// Parse response (auto-detects JSON vs CSV)
	sessions := parseCSVSessions(output)

	// Postman: pm.expect(jsonData).to.be.an("array"); pm.expect(jsonData.length).to.be.above(0)
	if len(sessions) == 0 {
		failTest("No sessions found")
	}

	// Postman: jsonData.forEach(s => validateSession(s, false))
	for i, session := range sessions {
		validateSession(session, fmt.Sprintf("Session %d", i+1))
	}

	passTest(fmt.Sprintf("Found %d charging sessions", len(sessions)))
	waitForUser()
}

func testPointstatusHistory(version string) {
	var fromDate, toDate string

	if version == "v1" {
		// Postman v1: /pointstatus/{{FirstNonReservedPointId}}/{{S1_DATE}}/{{E1_DATE}}
		stepHeader(fmt.Sprintf("Point Status History [200/204 - Point %d] %s (from %s to %s)",
			PointX, version, S1_DATE, E1_DATE))
		fromDate = S1_DATE
		toDate = E1_DATE
	} else {
		// Postman v2: /pointstatus/{{FirstNonReservedPointId}}/{{S2_DATE}}/{{E2_DATE}}
		stepHeader(fmt.Sprintf("Point Status History [200/204 - Point %d] %s (from %s to %s)",
			PointX, version, S2_DATE, E2_DATE))
		fromDate = S2_DATE
		toDate = E2_DATE
	}

	output, err := runCLI("pointstatus",
		"--id", fmt.Sprintf("%d", PointX),
		"--from", fromDate,
		"--to", toDate)
	if err != nil {
		fmt.Println(output)
		failTest("Pointstatus query failed: %v", err)
	}

	fmt.Println(output)

	// 204 = empty body, which is valid
	trimmed := strings.TrimSpace(output)
	if trimmed == "" {
		passTest("204 No Content — empty body (valid)")
	} else {
		// Parse response (auto-detects JSON vs CSV)
		history := parseCSVHistory(output)

		// Postman: pm.expect(jsonData).to.be.an("array"); pm.expect(jsonData.length).to.be.above(0)
		if len(history) == 0 {
			failTest("No status history found")
		}

		// Postman: jsonData.forEach(h => validateHistory(h, false))
		for i, record := range history {
			validateHistory(record, fmt.Sprintf("Record %d", i+1))
		}

		passTest(fmt.Sprintf("Found %d status changes", len(history)))
	}
	waitForUser()
}

// ============================================================================
// LOGOUT TEST
// ============================================================================

func testLogout() {
	stepHeader("Logout")

	output, err := runCLI("logout")
	if err != nil {
		fmt.Println(output)
		failTest("Logout failed: %v", err)
	}

	fmt.Println(output)

	passTest("Logged out successfully")
	waitForUser()
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func runCLI(args ...string) (string, error) {
	cmd := exec.Command("se2537", args...)
	cmd.Err = nil // Allow PATH-resolved executable (Go 1.19+ safety override)
	output, err := cmd.CombinedOutput()
	return string(output), err
}

// useAdminToken temporarily writes the admin token to .softeng_token
// and returns a function to restore the previous token
func useAdminToken() func() {
	// Save current user token
	previousToken := UserToken

	// Write admin token to file
	err := os.WriteFile(".softeng_token", []byte(AdminToken), 0644)
	if err != nil {
		failTest("Failed to write admin token to file: %v", err)
	}

	// Return restore function
	return func() {
		if previousToken != "" {
			err := os.WriteFile(".softeng_token", []byte(previousToken), 0644)
			if err != nil {
				failTest("Failed to restore user token: %v", err)
			}
		}
	}
}

func stepHeader(title string) {
	fmt.Println()
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Printf("  %s\n", title)
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

func passTest(message string) {
	fmt.Printf("\n✅ PASS: %s\n", message)
}

func failTest(format string, args ...interface{}) {
	fmt.Printf("\n❌ FAIL: "+format+"\n", args...)
	os.Exit(1)
}

func waitForUser() {
	fmt.Print("\n⏸  Press Enter to continue...")
	bufio.NewReader(os.Stdin).ReadBytes('\n')
}
