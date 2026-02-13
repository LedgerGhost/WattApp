package clitest

import (
	"crypto/tls"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"
)

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

const (
	BadPointID            = "99999999"
	DefaultReservationMin = 30
	MaxReservationMin     = 60
)

var (
	CLI        = envOrDefault("CLI_CMD", "se2537")
	BaseURL    = envOrDefault("BASE_URL", "https://localhost:9876/api")
	TokenFile  = envOrDefault("TOKEN_FILE", ".softeng_token")
	AdminToken string // set in TestMain

	allowedStatuses = []string{"available", "charging", "reserved", "malfunction", "offline"}
)

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// TestMain reads the admin token before any test runs.
// If ADMIN_TOKEN env var is not set, a pop-up dialog prompts the user.
func TestMain(m *testing.M) {
	flag.Parse()
	AdminToken = os.Getenv("ADMIN_TOKEN")
	if AdminToken == "" {
		AdminToken = promptTokenPopup()
	}
	if AdminToken == "" {
		fmt.Println("ERROR: No admin token provided. Aborting.")
		os.Exit(1)
	}
	fmt.Printf("Admin token: %s...%s\n", AdminToken[:6], AdminToken[len(AdminToken)-6:])
	os.Exit(m.Run())
}

// promptTokenPopup shows a Windows InputBox or falls back to terminal input.
func promptTokenPopup() string {
	// Try Windows GUI dialog first
	ps := `Add-Type -AssemblyName Microsoft.VisualBasic; ` +
		`[Microsoft.VisualBasic.Interaction]::InputBox("Enter the Admin API token:", "WattApp CLI Test - Admin Token", "")`
	cmd := exec.Command("powershell", "-NoProfile", "-Command", ps)
	cmd.Err = nil
	out, err := cmd.Output()
	if err == nil && strings.TrimSpace(string(out)) != "" {
		return strings.TrimSpace(string(out))
	}

	// Fallback: read from terminal (works on macOS / Linux / Windows without GUI)
	fmt.Print("Enter Admin API token: ")
	var token string
	fmt.Scanln(&token)
	return strings.TrimSpace(token)
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED STATE — carried across ordered subtests
// ═══════════════════════════════════════════════════════════════════════════════

type testState struct {
	email        string
	password     string
	userToken    string
	firstPointID string         // first non-reserved point
	counts       map[string]int // status → count (from full listing)
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

func runCLI(t *testing.T, args ...string) (stdout string, stderr string, code int) {
	t.Helper()
	cmd := exec.Command(CLI, args...)
	cmd.Err = nil // Allow PATH-resolved executable (Go 1.19+ safety override)
	var outBuf, errBuf strings.Builder
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf
	err := cmd.Run()
	code = 0
	if exitErr, ok := err.(*exec.ExitError); ok {
		code = exitErr.ExitCode()
	} else if err != nil {
		code = -1
	}
	return outBuf.String(), errBuf.String(), code
}

func mustRunCLI(t *testing.T, args ...string) string {
	t.Helper()
	out, errOut, code := runCLI(t, args...)
	if code != 0 {
		t.Fatalf("CLI exited %d\nargs: %v\nstdout: %s\nstderr: %s", code, args, out, errOut)
	}
	return out
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

func writeToken(t *testing.T, token string) {
	t.Helper()
	if err := os.WriteFile(TokenFile, []byte(token), 0644); err != nil {
		t.Fatalf("cannot write token file: %v", err)
	}
}

func deleteToken() { os.Remove(TokenFile) }

// ═══════════════════════════════════════════════════════════════════════════════
// RAW HTTP — for operations not exposed by the CLI
// ═══════════════════════════════════════════════════════════════════════════════

func newHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 15 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse // don't follow redirects
		},
	}
}

func doHTTP(t *testing.T, method, url, body string, headers map[string]string) (int, []byte) {
	t.Helper()
	var bodyReader io.Reader
	if body != "" {
		bodyReader = strings.NewReader(body)
	}
	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := newHTTPClient().Do(req)
	if err != nil {
		t.Fatalf("HTTP %s %s: %v", method, url, err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, data
}

func doGET(t *testing.T, url string, headers map[string]string) (int, []byte) {
	t.Helper()
	return doHTTP(t, "GET", url, "", headers)
}

func doPOST(t *testing.T, url, body string, headers map[string]string) (int, []byte) {
	t.Helper()
	return doHTTP(t, "POST", url, body, headers)
}

func doGETRedirect(t *testing.T, url string) (*http.Response, []byte) {
	t.Helper()
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	resp, err := newHTTPClient().Do(req)
	if err != nil {
		t.Fatalf("HTTP GET %s: %v", url, err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	return resp, data
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON / CSV PARSING
// ═══════════════════════════════════════════════════════════════════════════════

func parseObject(t *testing.T, raw string) map[string]interface{} {
	t.Helper()
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &m); err != nil {
		t.Fatalf("JSON object parse: %v\nraw: %.500s", err, raw)
	}
	return m
}

func parseArray(t *testing.T, raw string) []map[string]interface{} {
	t.Helper()
	var arr []map[string]interface{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &arr); err != nil {
		t.Fatalf("JSON array parse: %v\nraw: %.500s", err, raw)
	}
	return arr
}

func parseCSVRows(t *testing.T, raw string) []map[string]string {
	t.Helper()
	r := csv.NewReader(strings.NewReader(strings.TrimSpace(raw)))
	records, err := r.ReadAll()
	if err != nil {
		t.Fatalf("CSV parse: %v", err)
	}
	if len(records) < 2 {
		return nil
	}
	headers := records[0]
	out := make([]map[string]string, 0, len(records)-1)
	for _, row := range records[1:] {
		entry := make(map[string]string, len(headers))
		for i, h := range headers {
			val := ""
			if i < len(row) {
				val = strings.TrimSpace(row[i])
			}
			entry[strings.TrimSpace(h)] = val
		}
		out = append(out, entry)
	}
	return out
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATORS — mirror Postman's sharedUtils helpers
// ═══════════════════════════════════════════════════════════════════════════════

func checkPointJSON(t *testing.T, p map[string]interface{}) {
	t.Helper()
	// pointid
	pid, ok := p["pointid"].(float64)
	if !ok {
		t.Error("pointid missing or not a number")
	} else if pid < 0 {
		t.Errorf("pointid negative: %v", pid)
	}
	// lat / lon
	for _, c := range []struct {
		key    string
		lo, hi float64
	}{{"lat", -90, 90}, {"lon", -180, 180}} {
		s, _ := p[c.key].(string)
		if s == "" {
			t.Errorf("missing %s", c.key)
			continue
		}
		v, err := strconv.ParseFloat(s, 64)
		if err != nil {
			t.Errorf("%s not a float: %q", c.key, s)
		} else if v < c.lo || v > c.hi {
			t.Errorf("%s out of [%.0f,%.0f]: %v", c.key, c.lo, c.hi, v)
		}
	}
	// status
	st, _ := p["status"].(string)
	if !inSlice(allowedStatuses, st) {
		t.Errorf("bad status: %q", st)
	}
	// cap
	cap, ok := p["cap"].(float64)
	if !ok {
		t.Error("cap missing or not a number")
	} else if cap < 0 {
		t.Errorf("cap negative: %v", cap)
	}
}

func checkPointCSV(t *testing.T, p map[string]string) {
	t.Helper()
	pid, err := strconv.ParseFloat(p["pointid"], 64)
	if err != nil || pid < 0 {
		t.Errorf("bad pointid: %q", p["pointid"])
	}
	for _, c := range []struct {
		key    string
		lo, hi float64
	}{{"lat", -90, 90}, {"lon", -180, 180}} {
		v, err := strconv.ParseFloat(p[c.key], 64)
		if err != nil {
			t.Errorf("%s not a float: %q", c.key, p[c.key])
		} else if v < c.lo || v > c.hi {
			t.Errorf("%s out of range: %v", c.key, v)
		}
	}
	if !inSlice(allowedStatuses, p["status"]) {
		t.Errorf("bad status: %q", p["status"])
	}
	cap, err := strconv.ParseFloat(p["cap"], 64)
	if err != nil || cap < 0 {
		t.Errorf("bad cap: %q", p["cap"])
	}
}

func checkSessionJSON(t *testing.T, s map[string]interface{}) {
	t.Helper()
	required := []string{"starttime", "endtime", "startsoc", "endsoc", "totalkwh", "kwhprice", "amount"}
	for _, k := range required {
		if _, ok := s[k]; !ok {
			t.Errorf("session missing %q", k)
		}
	}
	for k := range s {
		if !inSlice(required, k) {
			t.Errorf("session has extra key %q", k)
		}
	}
	for _, nk := range []string{"startsoc", "endsoc", "totalkwh", "kwhprice", "amount"} {
		if v, ok := s[nk]; ok {
			if _, isNum := v.(float64); !isNum {
				t.Errorf("session %q not a number: %v", nk, v)
			}
		}
	}
}

func checkSessionCSV(t *testing.T, s map[string]string) {
	t.Helper()
	required := []string{"starttime", "endtime", "startsoc", "endsoc", "totalkwh", "kwhprice", "amount"}
	for _, k := range required {
		if _, ok := s[k]; !ok {
			t.Errorf("session CSV missing %q", k)
		}
	}
	for _, nk := range []string{"startsoc", "endsoc", "totalkwh", "kwhprice", "amount"} {
		if _, err := strconv.ParseFloat(s[nk], 64); err != nil {
			t.Errorf("session CSV %q not numeric: %q", nk, s[nk])
		}
	}
}

func checkHistoryJSON(t *testing.T, h map[string]interface{}) {
	t.Helper()
	for _, k := range []string{"timeref", "old_state", "new_state"} {
		v, ok := h[k].(string)
		if !ok {
			t.Errorf("history missing/bad %q", k)
			continue
		}
		if k == "old_state" || k == "new_state" {
			if !inSlice(allowedStatuses, v) {
				t.Errorf("history %q: bad status %q", k, v)
			}
		}
	}
}

func checkHistoryCSV(t *testing.T, h map[string]string) {
	t.Helper()
	for _, k := range []string{"timeref", "old_state", "new_state"} {
		if _, ok := h[k]; !ok {
			t.Errorf("history CSV missing %q", k)
		}
	}
	for _, k := range []string{"old_state", "new_state"} {
		if !inSlice(allowedStatuses, h[k]) {
			t.Errorf("history CSV %q bad status: %q", k, h[k])
		}
	}
}

// checkErrorSchema validates the standard error envelope the Postman collection enforces.
func checkErrorSchema(t *testing.T, obj map[string]interface{}) {
	t.Helper()
	required := []string{"call", "timeref", "originator", "return_code", "error", "debuginfo"}
	for _, k := range required {
		if _, ok := obj[k]; !ok {
			t.Errorf("error schema: missing %q", k)
		}
	}
	if rc, ok := obj["return_code"]; ok {
		if _, isNum := rc.(float64); !isNum {
			t.Errorf("return_code not a number: %v", rc)
		}
	}
	allowed := map[string]bool{
		"call": true, "timeref": true, "originator": true,
		"return_code": true, "error": true, "debuginfo": true,
	}
	for k := range obj {
		if !allowed[k] {
			t.Errorf("error schema: extra key %q", k)
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMALL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

func inSlice(ss []string, val string) bool {
	for _, s := range ss {
		if s == val {
			return true
		}
	}
	return false
}

func str(obj map[string]interface{}, key string) string {
	v, _ := obj[key].(string)
	return v
}

func toJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func dataPath(name string) string {
	p, _ := filepath.Abs(filepath.Join("testdata", name))
	return p
}

func countByStatus(arr []map[string]interface{}) map[string]int {
	m := map[string]int{}
	for _, s := range allowedStatuses {
		m[s] = 0
	}
	for _, p := range arr {
		if s, _ := p["status"].(string); inSlice(allowedStatuses, s) {
			m[s]++
		}
	}
	return m
}

func countByStatusCSV(arr []map[string]string) map[string]int {
	m := map[string]int{}
	for _, s := range allowedStatuses {
		m[s] = 0
	}
	for _, p := range arr {
		if inSlice(allowedStatuses, p["status"]) {
			m[p["status"]]++
		}
	}
	return m
}

func toFloat(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

var isoRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$`)
var dateMinRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$`)

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST — sequential flow matching the Postman collection runner order
// ═══════════════════════════════════════════════════════════════════════════════

func TestCLIFlow(t *testing.T) {
	deleteToken()
	defer deleteToken()

	st := &testState{
		password: "StrongP@ssw0rd!",
		counts:   map[string]int{},
	}

	// ─── 1. AUTH ──────────────────────────────────────────────────────────

	t.Run("Auth", func(t *testing.T) {

		t.Run("Signup_200", func(t *testing.T) {
			// CLI has no signup command → hit the API directly
			st.email = fmt.Sprintf("test_%d_%x@example.com",
				time.Now().UnixMilli(), rand.Int31())

			body := fmt.Sprintf(
				`{"fullName":"Test User","email":"%s","password":"%s","phone":"+30123456789"}`,
				st.email, st.password)

			code, _ := doPOST(t, BaseURL+"/auth/signup", body,
				map[string]string{"Content-Type": "application/json"})
			if code != 200 {
				t.Fatalf("signup returned %d", code)
			}
		})

		t.Run("Login_200", func(t *testing.T) {
			out := mustRunCLI(t, "login", "--email", st.email, "--passw", st.password)
			if !strings.Contains(out, "Login Successful") {
				t.Fatalf("login output: %s", out)
			}

			raw, err := os.ReadFile(TokenFile)
			if err != nil {
				t.Fatalf("token file missing: %v", err)
			}
			st.userToken = strings.TrimSpace(string(raw))
			if st.userToken == "" {
				t.Fatal("token empty")
			}
		})
	})

	// ─── 2. ADMIN ─────────────────────────────────────────────────────────

	t.Run("Admin", func(t *testing.T) {

		t.Run("Healthcheck_200", func(t *testing.T) {
			out := mustRunCLI(t, "healthcheck")
			if !strings.Contains(out, "27017/wattapp") {
				t.Errorf("missing DB string:\n%s", out)
			}
		})

		t.Run("ResetPoints_200", func(t *testing.T) {
			writeToken(t, AdminToken)
			out := mustRunCLI(t, "resetpoints")
			obj := parseObject(t, out)

			if v, _ := obj["total_points_imported"].(float64); v != 2465 {
				t.Errorf("expected 2465 imported, got %v", v)
			}
			if v, _ := obj["source_file"].(string); v != "resetpointsdata.json" {
				t.Errorf("expected resetpointsdata.json, got %q", v)
			}
		})

		t.Run("ResetPoints_401_InvalidToken", func(t *testing.T) {
			// CLI does auto-retry on 401, so test the raw API
			code, body := doPOST(t, BaseURL+"/admin/resetpoints", "",
				map[string]string{"X-OBSERVATORY-AUTH": `"random-token"`})
			if code != 401 {
				t.Errorf("expected 401, got %d", code)
			}
			s := string(body)
			if !strings.Contains(s, "Authentication required") &&
				!strings.Contains(s, "Token not found or session expired") {
				t.Errorf("unexpected 401 body: %s", s)
			}
		})

		t.Run("ResetPoints_403_UserToken", func(t *testing.T) {
			code, body := doPOST(t, BaseURL+"/admin/resetpoints", "",
				map[string]string{"X-OBSERVATORY-AUTH": st.userToken})
			if code != 403 {
				t.Errorf("expected 403, got %d", code)
			}
			if !strings.Contains(string(body), "Access Denied") {
				t.Errorf("expected 'Access Denied': %s", body)
			}
		})

		// Restore admin token for the upload tests
		writeToken(t, AdminToken)

		t.Run("AddPoints_200_OK", func(t *testing.T) {
			out := mustRunCLI(t, "addpoints", "--source", dataPath("addpoints.csv"))
			obj := parseObject(t, out)

			if s := str(obj, "status"); !strings.Contains(s, "OK") {
				t.Errorf("status: %q", s)
			}
			if s := str(obj, "info"); !strings.Contains(s, "successfully") {
				t.Errorf("info: %q", s)
			}
			if v, _ := obj["points_imported"].(float64); v != 4 {
				t.Errorf("expected 4 imported, got %v", v)
			}
			tr := str(obj, "timeref")
			if !isoRe.MatchString(tr) {
				t.Errorf("timeref not ISO 8601: %q", tr)
			}
			if parsed, err := time.Parse(time.RFC3339Nano, tr); err == nil {
				if math.Abs(time.Since(parsed).Seconds()) > 60 {
					t.Error("timeref not current")
				}
			}
		})

		t.Run("AddPoints_200_DuplicateIDs", func(t *testing.T) {
			out := mustRunCLI(t, "addpoints", "--source", dataPath("addpoints.csv"))
			obj := parseObject(t, out)

			if s := str(obj, "status"); !strings.Contains(s, "OK") {
				t.Errorf("status: %q", s)
			}
			if s := str(obj, "info"); !strings.Contains(s, "Process completed, but some points were skipped") {
				t.Errorf("info: %q", s)
			}
			if s := str(obj, "debuginfo"); !strings.Contains(s, "Duplicate") {
				t.Errorf("debuginfo: %q", s)
			}
		})

		t.Run("AddPoints_400_NoFile", func(t *testing.T) {
			// CLI shows help when no --source given, so test the raw API
			code, body := doPOST(t, BaseURL+"/admin/addpoints", "",
				map[string]string{"X-OBSERVATORY-AUTH": AdminToken})
			if code != 400 {
				t.Fatalf("expected 400, got %d", code)
			}
			obj := parseObject(t, string(body))
			checkErrorSchema(t, obj)

			if rc, _ := obj["return_code"].(float64); rc != 400 {
				t.Errorf("return_code: %v", rc)
			}
			e := str(obj, "error")
			if !strings.Contains(e, "No file uploaded") ||
				!strings.Contains(e, "Expected multipart/form-data") {
				t.Errorf("error: %q", e)
			}
			if d := str(obj, "debuginfo"); !strings.Contains(d, "provide a CSV file") {
				t.Errorf("debuginfo: %q", d)
			}
		})

		t.Run("AddPoints_400_WrongFileType", func(t *testing.T) {
			out, _, _ := runCLI(t, "addpoints", "--source", dataPath("addpointswrongtestfile.docx"))
			obj := parseObject(t, out)
			checkErrorSchema(t, obj)
			if e := str(obj, "error"); !strings.Contains(e, "Failed to parse CSV file") {
				t.Errorf("error: %q", e)
			}
		})

		t.Run("AddPoints_400_MissingColumns", func(t *testing.T) {
			out, _, _ := runCLI(t, "addpoints", "--source", dataPath("addpointsmissingcolumns.csv"))
			obj := parseObject(t, out)
			c := strings.ToLower(str(obj, "error") + " " + str(obj, "debuginfo"))
			if !strings.Contains(c, "missing required columns") {
				t.Errorf("missing 'missing required columns': %s", c)
			}
			if !strings.Contains(c, "format must strictly match") {
				t.Errorf("missing 'format must strictly match': %s", c)
			}
		})

		t.Run("AddPoints_400_MissingPointID", func(t *testing.T) {
			out, _, _ := runCLI(t, "addpoints", "--source", dataPath("addpointsmissingpointid.csv"))
			obj := parseObject(t, out)
			checkErrorSchema(t, obj)
			c := strings.ToLower(str(obj, "error") + " " + str(obj, "debuginfo"))
			if !strings.Contains(c, "missing 'pointid'") {
				t.Errorf("missing pointid message: %s", c)
			}
			if !strings.Contains(c, "validation error") {
				t.Errorf("missing 'validation error': %s", c)
			}
		})

		t.Run("AddPoints_400_WrongLat", func(t *testing.T) {
			out, _, _ := runCLI(t, "addpoints", "--source", dataPath("addpointswronglat.csv"))
			obj := parseObject(t, out)
			checkErrorSchema(t, obj)
			c := strings.ToLower(str(obj, "error") + " " + str(obj, "debuginfo"))
			if !strings.Contains(c, "coordinates out of bounds") {
				t.Errorf("missing bounds message: %s", c)
			}
		})
	})

	// ─── 3. POINTS ────────────────────────────────────────────────────────

	t.Run("Points", func(t *testing.T) {

		t.Run("ListAll_200_JSON_CSV", func(t *testing.T) {
			// ── JSON ──
			jsonOut := mustRunCLI(t, "points", "--format", "json")
			jsonArr := parseArray(t, jsonOut)
			if len(jsonArr) == 0 {
				t.Fatal("empty points array")
			}
			for _, p := range jsonArr {
				checkPointJSON(t, p)
			}

			st.counts = countByStatus(jsonArr)
			t.Logf("status counts: %v", st.counts)

			// pick first non-reserved point
			for _, p := range jsonArr {
				if s, _ := p["status"].(string); s != "reserved" {
					pid, _ := p["pointid"].(float64)
					st.firstPointID = strconv.Itoa(int(pid))
					break
				}
			}
			if st.firstPointID == "" {
				t.Fatal("no non-reserved point found")
			}
			t.Logf("first non-reserved point: %s", st.firstPointID)

			// ── CSV ──
			csvOut := mustRunCLI(t, "points", "--format", "csv")
			csvArr := parseCSVRows(t, csvOut)
			if len(csvArr) != len(jsonArr) {
				t.Errorf("CSV rows %d ≠ JSON rows %d", len(csvArr), len(jsonArr))
			}
			for _, p := range csvArr {
				checkPointCSV(t, p)
			}

			// cross-check counts
			csvCounts := countByStatusCSV(csvArr)
			for _, s := range allowedStatuses {
				if st.counts[s] != csvCounts[s] {
					t.Errorf("status %q: JSON %d ≠ CSV %d", s, st.counts[s], csvCounts[s])
				}
			}
		})

		t.Run("ListByStatus_200_Loop", func(t *testing.T) {
			for _, status := range allowedStatuses {
				t.Run(status, func(t *testing.T) {
					expected := st.counts[status]

					// JSON
					jOut, _, jCode := runCLI(t, "points", "--status", status, "--format", "json")
					var jCount int
					if jCode == 0 && strings.TrimSpace(jOut) != "" {
						arr := parseArray(t, jOut)
						jCount = len(arr)
						for _, p := range arr {
							checkPointJSON(t, p)
						}
					}
					if jCount != expected {
						t.Errorf("JSON count %d ≠ expected %d", jCount, expected)
					}

					// CSV
					cOut, _, _ := runCLI(t, "points", "--status", status, "--format", "csv")
					var cCount int
					if strings.TrimSpace(cOut) != "" {
						rows := parseCSVRows(t, cOut)
						cCount = len(rows)
						for _, p := range rows {
							checkPointCSV(t, p)
						}
					}
					if cCount != jCount {
						t.Errorf("CSV %d ≠ JSON %d", cCount, jCount)
					}
				})
			}
		})

		t.Run("ListPoints_400_InvalidInput", func(t *testing.T) {
			t.Run("BadStatus", func(t *testing.T) {
				out, _, _ := runCLI(t, "points", "--status", "randomStatus123", "--format", "json")
				obj := parseObject(t, out)
				if rc, _ := obj["return_code"].(float64); rc != 400 {
					t.Errorf("return_code: %v", rc)
				}
				if e := strings.ToLower(str(obj, "error")); !strings.Contains(e, "randomstatus123") {
					t.Errorf("error should cite bad input: %q", e)
				}
			})
			t.Run("BadFormat", func(t *testing.T) {
				out, _, _ := runCLI(t, "points", "--status", "available", "--format", "randomFormat123")
				obj := parseObject(t, out)
				if rc, _ := obj["return_code"].(float64); rc != 400 {
					t.Errorf("return_code: %v", rc)
				}
				if e := strings.ToLower(str(obj, "error")); !strings.Contains(e, "randomformat123") {
					t.Errorf("error should cite bad format: %q", e)
				}
			})
		})

		t.Run("SinglePoint_200_NonReserved", func(t *testing.T) {
			out := mustRunCLI(t, "point", "--id", st.firstPointID)
			obj := parseObject(t, out)

			pid, _ := obj["pointid"].(float64)
			if strconv.Itoa(int(pid)) != st.firstPointID {
				t.Errorf("returned id %v ≠ requested %s", pid, st.firstPointID)
			}
			checkPointJSON(t, obj)

			ret := str(obj, "reservationendtime")
			if !dateMinRe.MatchString(ret) {
				t.Errorf("reservationendtime format: %q", ret)
			}
			// non-reserved → time ≈ now
			if s, _ := obj["status"].(string); s != "reserved" {
				if parsed, err := time.ParseInLocation("2006-01-02 15:04", ret, time.Local); err == nil {
					if math.Abs(time.Since(parsed).Minutes()) > 1 {
						t.Errorf("non-reserved point time off: %q", ret)
					}
				}
			}
		})

		t.Run("SinglePoint_204_NotFound", func(t *testing.T) {
			out, _, _ := runCLI(t, "point", "--id", BadPointID)
			if strings.TrimSpace(out) != "" {
				t.Errorf("expected empty body, got: %q", out)
			}
		})

		// ── Update ──

		t.Run("UpdatePoint_200", func(t *testing.T) {
			writeToken(t, st.userToken)
			out := mustRunCLI(t, "updpoint",
				"--id", st.firstPointID,
				"--status", "available",
				"--price", "0.25")
			obj := parseObject(t, out)
			for _, k := range []string{"pointid", "status", "kwhprice"} {
				if _, ok := obj[k]; !ok {
					t.Errorf("missing %q", k)
				}
			}
		})

		t.Run("UpdatePoint_400_Scenarios", func(t *testing.T) {
			writeToken(t, st.userToken)

			tests := []struct {
				name, id, status, price string
				direct                  bool // use raw HTTP instead of CLI
				body                    string
				expect                  string
			}{
				{"EmptyBody", st.firstPointID, "", "", true, "{}", "empty body"},
				{"BadPrice", st.firstPointID, "available", "-5", false, "", "invalid kwhprice"},
				{"NotFound", BadPointID, "available", "0.5", false, "", "not found"},
			}

			for _, tc := range tests {
				t.Run(tc.name, func(t *testing.T) {
					var raw string
					if tc.direct {
						code, body := doPOST(t,
							BaseURL+"/updpoint/"+tc.id, tc.body,
							map[string]string{
								"X-OBSERVATORY-AUTH": st.userToken,
								"Content-Type":       "application/json",
							})
						if code != 400 {
							t.Fatalf("expected 400, got %d", code)
						}
						raw = string(body)
					} else {
						args := []string{"updpoint", "--id", tc.id}
						if tc.status != "" {
							args = append(args, "--status", tc.status)
						}
						if tc.price != "" {
							args = append(args, "--price", tc.price)
						}
						raw, _, _ = runCLI(t, args...)
					}
					obj := parseObject(t, raw)
					checkErrorSchema(t, obj)
					c := strings.ToLower(str(obj, "error") + " " + str(obj, "debuginfo"))
					if !strings.Contains(c, strings.ToLower(tc.expect)) {
						t.Errorf("expected %q in: %s", tc.expect, c)
					}
				})
			}
		})
	})

	// ─── 4. RESERVATIONS ──────────────────────────────────────────────────

	t.Run("Reservations", func(t *testing.T) {
		writeToken(t, st.userToken)

		t.Run("Reserve_200_DefaultMinutes", func(t *testing.T) {
			out := mustRunCLI(t, "reserve", "--id", st.firstPointID)
			obj := parseObject(t, out)

			pid, _ := obj["pointid"].(float64)
			if strconv.Itoa(int(pid)) != st.firstPointID {
				t.Errorf("pointid: %v", pid)
			}
			if s := str(obj, "status"); s != "reserved" {
				t.Errorf("status: %q", s)
			}

			ret := str(obj, "reservationendtime")
			if ret == "" {
				t.Fatal("no reservationendtime")
			}
			if parsed, err := time.ParseInLocation("2006-01-02 15:04", ret, time.Local); err == nil {
				want := time.Now().Add(time.Duration(DefaultReservationMin) * time.Minute)
				if math.Abs(want.Sub(parsed).Minutes()) > 2 {
					t.Errorf("time off: %q", ret)
				}
			}
		})

		t.Run("GetReservedPoint_200", func(t *testing.T) {
			out := mustRunCLI(t, "point", "--id", st.firstPointID)
			obj := parseObject(t, out)
			checkPointJSON(t, obj)

			ret := str(obj, "reservationendtime")
			if !dateMinRe.MatchString(ret) {
				t.Errorf("format: %q", ret)
			}
			if s := str(obj, "status"); s == "reserved" {
				if parsed, err := time.ParseInLocation("2006-01-02 15:04", ret, time.Local); err == nil {
					if !parsed.After(time.Date(1971, 1, 1, 0, 0, 0, 0, time.UTC)) {
						t.Errorf("reservation time too old: %v", parsed)
					}
				}
			}
		})

		// Helper: reset to available
		t.Run("Helper_ResetAvailable_v1", func(t *testing.T) {
			mustRunCLI(t, "updpoint", "--id", st.firstPointID, "--status", "available")
		})

		t.Run("Reserve_200_CustomMinutes", func(t *testing.T) {
			cases := []struct {
				send, effective int
				tag             string
			}{
				{15, 15, "15min"},
				{45, 45, "45min"},
				{75, MaxReservationMin, "75min_capped"},
			}
			for _, tc := range cases {
				t.Run(tc.tag, func(t *testing.T) {
					out := mustRunCLI(t, "reserve",
						"--id", st.firstPointID,
						"--minutes", strconv.Itoa(tc.send))
					obj := parseObject(t, out)

					if s := str(obj, "status"); s != "reserved" {
						t.Errorf("status: %q", s)
					}
					ret := str(obj, "reservationendtime")
					if parsed, err := time.ParseInLocation("2006-01-02 15:04", ret, time.Local); err == nil {
						want := time.Now().Add(time.Duration(tc.effective) * time.Minute)
						if math.Abs(want.Sub(parsed).Minutes()) > 2 {
							t.Errorf("time off by %.1f min", want.Sub(parsed).Minutes())
						}
					}
					// cleanup
					mustRunCLI(t, "updpoint", "--id", st.firstPointID, "--status", "available")
				})
			}
		})

		t.Run("Reserve_200_UnavailablePoint", func(t *testing.T) {
			// set to offline first
			mustRunCLI(t, "updpoint", "--id", st.firstPointID, "--status", "offline")

			out := mustRunCLI(t, "reserve", "--id", st.firstPointID)
			obj := parseObject(t, out)

			if s := str(obj, "status"); s == "reserved" {
				t.Error("offline point should NOT become reserved")
			}
			if ret := str(obj, "reservationendtime"); ret != "1970-01-01 00:00" {
				t.Errorf("rejected reservation should be epoch, got %q", ret)
			}
		})

		t.Run("Reserve_400_PointNotFound", func(t *testing.T) {
			out, _, _ := runCLI(t, "reserve", "--id", BadPointID)
			obj := parseObject(t, out)
			checkErrorSchema(t, obj)

			if rc, _ := obj["return_code"].(float64); rc != 400 {
				t.Errorf("return_code: %v", rc)
			}
			e := str(obj, "error")
			if !strings.Contains(e, BadPointID) || !strings.Contains(e, "not found") {
				t.Errorf("error: %q", e)
			}
			if d := str(obj, "debuginfo"); d != "Check if pointid exists" {
				t.Errorf("debuginfo: %q", d)
			}
		})
	})

	// ─── 5. SESSIONS ──────────────────────────────────────────────────────

	t.Run("Sessions", func(t *testing.T) {
		writeToken(t, st.userToken)

		// reset point to available
		mustRunCLI(t, "updpoint", "--id", st.firstPointID, "--status", "available")

		t.Run("NewSession_200_ThreeRuns", func(t *testing.T) {
			for i := 1; i <= 3; i++ {
				t.Run(fmt.Sprintf("Run%d", i), func(t *testing.T) {
					start := time.Now().AddDate(0, 0, -rand.Intn(30))
					end := start.Add(time.Duration(15+rand.Intn(105)) * time.Minute)
					sSoc := 10 + rand.Intn(80)
					eSoc := sSoc + 5 + rand.Intn(15)
					if eSoc > 100 {
						eSoc = 100
					}
					kwh := 5.0 + rand.Float64()*45.0
					price := 0.20 + rand.Float64()*0.30
					amt := kwh * price

					out, _, code := runCLI(t, "newsession",
						"--id", st.firstPointID,
						"--starttime", start.Format("2006-01-02T15:04:05")+"Z",
						"--endtime", end.Format("2006-01-02T15:04:05")+"Z",
						"--startsoc", strconv.Itoa(sSoc),
						"--endsoc", strconv.Itoa(eSoc),
						"--totalkwh", fmt.Sprintf("%.2f", kwh),
						"--kwhprice", fmt.Sprintf("%.2f", price),
						"--amount", fmt.Sprintf("%.3f", amt),
					)
					if code != 0 {
						t.Fatalf("newsession exit %d: %s", code, out)
					}
				})
			}
		})

		t.Run("NewSession_400_PointNotFound", func(t *testing.T) {
			out, _, _ := runCLI(t, "newsession",
				"--id", BadPointID,
				"--starttime", "2026-01-30T10:00:00Z",
				"--endtime", "2026-01-30T12:00:00Z",
				"--startsoc", "50", "--endsoc", "80",
				"--totalkwh", "10.5", "--kwhprice", "0.50", "--amount", "5.25")
			obj := parseObject(t, out)
			checkErrorSchema(t, obj)
			e := str(obj, "error")
			if !strings.Contains(e, fmt.Sprintf("Point with id %s not found", BadPointID)) {
				t.Errorf("error: %q", e)
			}
			if d := str(obj, "debuginfo"); d != "Invalid pointid" {
				t.Errorf("debuginfo: %q", d)
			}
		})

		t.Run("NewSession_400_InvalidData", func(t *testing.T) {
			base := map[string]string{
				"--id": st.firstPointID, "--starttime": "2024-01-01T10:00:00Z",
				"--endtime": "2024-01-01T12:00:00Z", "--startsoc": "20",
				"--endsoc": "80", "--totalkwh": "50", "--kwhprice": "0.50",
				"--amount": "25.00",
			}

			scenarios := []struct {
				name    string
				mods    map[string]string // override values
				remove  string            // key to delete
				expect  string
				useHTTP bool // use raw HTTP (for missing-field test)
			}{
				{
					name:    "MissingField",
					remove:  "--id",
					expect:  "Missing required fields",
					useHTTP: true,
				},
				{
					name:   "EndBeforeStart",
					mods:   map[string]string{"--starttime": "2024-01-01T12:00:00Z", "--endtime": "2024-01-01T10:00:00Z"},
					expect: "Invalid time range",
				},
				{
					name:   "SoCBackwards",
					mods:   map[string]string{"--startsoc": "80", "--endsoc": "20"},
					expect: "Invalid session values",
				},
				{
					name:   "NegativeAmount",
					mods:   map[string]string{"--amount": "-100"},
					expect: "Invalid session values",
				},
			}

			for _, sc := range scenarios {
				t.Run(sc.name, func(t *testing.T) {
					merged := map[string]string{}
					for k, v := range base {
						merged[k] = v
					}
					for k, v := range sc.mods {
						merged[k] = v
					}
					if sc.remove != "" {
						delete(merged, sc.remove)
					}

					var raw string
					if sc.useHTTP {
						// Build JSON payload without pointid
						payload := map[string]interface{}{
							"starttime": merged["--starttime"],
							"endtime":   merged["--endtime"],
							"startsoc":  toFloat(merged["--startsoc"]),
							"endsoc":    toFloat(merged["--endsoc"]),
							"totalkwh":  toFloat(merged["--totalkwh"]),
							"kwhprice":  toFloat(merged["--kwhprice"]),
							"amount":    toFloat(merged["--amount"]),
						}
						code, body := doPOST(t, BaseURL+"/newsession",
							toJSON(payload),
							map[string]string{
								"X-OBSERVATORY-AUTH": st.userToken,
								"Content-Type":       "application/json",
							})
						if code != 400 {
							t.Fatalf("expected 400, got %d", code)
						}
						raw = string(body)
					} else {
						args := []string{"newsession"}
						for k, v := range merged {
							args = append(args, k, v)
						}
						raw, _, _ = runCLI(t, args...)
					}

					obj := parseObject(t, raw)
					checkErrorSchema(t, obj)
					c := str(obj, "error") + " " + str(obj, "debuginfo")
					if !strings.Contains(c, sc.expect) {
						t.Errorf("expected %q in: %s", sc.expect, c)
					}
				})
			}
		})

		t.Run("GetSessions_200_JSON_CSV", func(t *testing.T) {
			for _, fmtStr := range []string{"json", "csv"} {
				t.Run(strings.ToUpper(fmtStr), func(t *testing.T) {
					out := mustRunCLI(t, "sessions",
						"--id", st.firstPointID,
						"--from", "19701212", "--to", "50001212",
						"--format", fmtStr)

					if fmtStr == "json" {
						arr := parseArray(t, out)
						if len(arr) == 0 {
							t.Fatal("no sessions")
						}
						for _, s := range arr {
							checkSessionJSON(t, s)
						}
					} else {
						rows := parseCSVRows(t, out)
						if len(rows) == 0 {
							t.Fatal("no sessions in CSV")
						}
						for _, s := range rows {
							checkSessionCSV(t, s)
						}
					}
				})
			}
		})

		t.Run("GetSessions_204_Empty", func(t *testing.T) {
			out, _, _ := runCLI(t, "sessions",
				"--id", st.firstPointID,
				"--from", "19700101", "--to", "19700101",
				"--format", "json")
			if strings.TrimSpace(out) != "" {
				t.Errorf("expected empty, got: %q", out)
			}
		})

		t.Run("GetSessions_400_Errors", func(t *testing.T) {
			cases := []struct {
				name, from, to, format, expect, extra string
			}{
				{"DateRangeReversed", "20240105", "20240101", "json", "Invalid date range", "'from' must be <= 'to'"},
				{"InvalidFormat", "20240101", "20240102", "xml", "Invalid format", "json, csv"},
			}
			for _, tc := range cases {
				t.Run(tc.name, func(t *testing.T) {
					out, _, _ := runCLI(t, "sessions",
						"--id", st.firstPointID,
						"--from", tc.from, "--to", tc.to,
						"--format", tc.format)
					obj := parseObject(t, out)
					checkErrorSchema(t, obj)
					c := str(obj, "error") + " " + str(obj, "debuginfo")
					if !strings.Contains(c, tc.expect) {
						t.Errorf("expected %q in: %s", tc.expect, c)
					}
					if tc.extra != "" && !strings.Contains(c, tc.extra) {
						t.Errorf("expected %q in: %s", tc.extra, c)
					}
				})
			}
		})
	})

	// ─── 6. HISTORY ───────────────────────────────────────────────────────

	t.Run("History", func(t *testing.T) {

		t.Run("PointStatus_200_JSON_CSV", func(t *testing.T) {
			for _, fmtStr := range []string{"json", "csv"} {
				t.Run(strings.ToUpper(fmtStr), func(t *testing.T) {
					out := mustRunCLI(t, "pointstatus",
						"--id", st.firstPointID,
						"--from", "19701212", "--to", "50001212",
						"--format", fmtStr)

					if fmtStr == "json" {
						arr := parseArray(t, out)
						if len(arr) == 0 {
							t.Fatal("no history")
						}
						for _, h := range arr {
							checkHistoryJSON(t, h)
						}
					} else {
						if !strings.Contains(out, "timeref") ||
							!strings.Contains(out, "old_state") ||
							!strings.Contains(out, "new_state") {
							t.Error("CSV missing expected headers")
						}
						rows := parseCSVRows(t, out)
						if len(rows) == 0 {
							t.Fatal("no history in CSV")
						}
						for _, h := range rows {
							checkHistoryCSV(t, h)
						}
					}
				})
			}
		})

		t.Run("PointStatus_204_Empty", func(t *testing.T) {
			out, _, _ := runCLI(t, "pointstatus",
				"--id", st.firstPointID,
				"--from", "19700101", "--to", "19700101",
				"--format", "json")
			if strings.TrimSpace(out) != "" {
				t.Errorf("expected empty, got: %q", out)
			}
		})

		t.Run("PointStatus_400_Errors", func(t *testing.T) {
			cases := []struct {
				name, from, to, format, expect string
			}{
				{"InvalidFormat", "19701212", "20991212", "randomformat123",
					"Invalid format 'randomformat123'"},
				{"InvalidDateFormat", "25515151", "Ada123", "json",
					"Invalid date format"},
				{"DateRangeReversed", "20991212", "19701212", "json",
					"From date must be before or equal to To date"},
			}
			for _, tc := range cases {
				t.Run(tc.name, func(t *testing.T) {
					out, _, _ := runCLI(t, "pointstatus",
						"--id", st.firstPointID,
						"--from", tc.from, "--to", tc.to,
						"--format", tc.format)
					obj := parseObject(t, out)
					checkErrorSchema(t, obj)
					if rc, _ := obj["return_code"].(float64); rc != 400 {
						t.Errorf("return_code: %v", rc)
					}
					if e := str(obj, "error"); !strings.Contains(e, tc.expect) {
						t.Errorf("expected %q in: %q", tc.expect, e)
					}
				})
			}
		})
	})

	// ─── 7. NAVIGATION (no CLI command — raw HTTP) ────────────────────────

	t.Run("Navigation", func(t *testing.T) {

		t.Run("Navigate_302_ValidPoint", func(t *testing.T) {
			resp, _ := doGETRedirect(t, BaseURL+"/navigate/"+st.firstPointID)
			if resp.StatusCode != 302 {
				t.Errorf("expected 302, got %d", resp.StatusCode)
			}
			if loc := resp.Header.Get("Location"); loc == "" {
				t.Error("missing Location header")
			}
		})

		t.Run("Navigate_400_InvalidPoint", func(t *testing.T) {
			code, body := doGET(t, BaseURL+"/navigate/"+BadPointID, nil)
			if code != 400 {
				t.Errorf("expected 400, got %d", code)
			}
			obj := parseObject(t, string(body))
			checkErrorSchema(t, obj)
		})
	})

	// ─── 8. LOGOUT ────────────────────────────────────────────────────────

	t.Run("Logout_200", func(t *testing.T) {
		writeToken(t, st.userToken)
		out, _, code := runCLI(t, "logout")
		if code != 0 {
			t.Errorf("exit %d: %s", code, out)
		}
		if _, err := os.Stat(TokenFile); err == nil {
			t.Error("token file still exists after logout")
		}
	})
}
