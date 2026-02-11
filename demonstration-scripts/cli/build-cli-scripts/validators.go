package main

import (
	"math"
	"strconv"
	"time"
)

var allowedStatuses = []string{"available", "charging", "reserved", "malfunction", "offline"}

// validatePoint validates a point structure
// Matches Postman's validatePoint(point, isCsv, isproviderName)
func validatePoint(point Point, _ bool, context string) {
	// Postman: pm.expect(idVal, "Point ID").to.be.a('number'); .to.not.be.NaN; .to.be.at.least(0)
	if point.PointID < 0 {
		failTest("%s: Invalid point ID %d (must be >= 0)", context, point.PointID)
	}

	// Postman: pm.expect(point.lon, "Longitude").to.be.a('string')
	// Postman: pm.expect(point.lat, "Latitude").to.be.a('string')
	latNum, err := strconv.ParseFloat(point.Lat, 64)
	if err != nil {
		failTest("%s: Invalid latitude '%s' (cannot parse as float)", context, point.Lat)
	}

	lonNum, err := strconv.ParseFloat(point.Lon, 64)
	if err != nil {
		failTest("%s: Invalid longitude '%s' (cannot parse as float)", context, point.Lon)
	}

	// Postman: pm.expect(latNum, "Latitude Range").to.be.within(-90, 90)
	if latNum < -90 || latNum > 90 {
		failTest("%s: Latitude %.6f out of range [-90, 90]", context, latNum)
	}

	// Postman: pm.expect(lonNum, "Longitude Range").to.be.within(-180, 180)
	if lonNum < -180 || lonNum > 180 {
		failTest("%s: Longitude %.6f out of range [-180, 180]", context, lonNum)
	}

	// Postman: pm.expect(allowed, "Status Value").to.include(point.status)
	if !contains(allowedStatuses, point.Status) {
		failTest("%s: Invalid status '%s' (allowed: %v)", context, point.Status, allowedStatuses)
	}

	// Postman: pm.expect(capVal, "Capacity").to.be.a('number'); .to.not.be.NaN; .to.be.at.least(0)
	if point.Cap < 0 {
		failTest("%s: Invalid capacity %d (must be >= 0)", context, point.Cap)
	}
}

// validatePointDetails validates point details (without providerName)
// Matches Postman's validatePoint(data, isCsv=false, isproviderName=false) + kwhprice
func validatePointDetails(point PointDetails, context string) {
	// Postman: pm.expect(idVal).to.be.at.least(0)
	if point.PointID < 0 {
		failTest("%s: Invalid point ID %d (must be >= 0)", context, point.PointID)
	}

	// Coordinates
	latNum, err := strconv.ParseFloat(point.Lat, 64)
	if err != nil {
		failTest("%s: Invalid latitude '%s' (cannot parse as float)", context, point.Lat)
	}

	lonNum, err := strconv.ParseFloat(point.Lon, 64)
	if err != nil {
		failTest("%s: Invalid longitude '%s' (cannot parse as float)", context, point.Lon)
	}

	if latNum < -90 || latNum > 90 {
		failTest("%s: Latitude %.6f out of range [-90, 90]", context, latNum)
	}

	if lonNum < -180 || lonNum > 180 {
		failTest("%s: Longitude %.6f out of range [-180, 180]", context, lonNum)
	}

	// Status
	if !contains(allowedStatuses, point.Status) {
		failTest("%s: Invalid status '%s' (allowed: %v)", context, point.Status, allowedStatuses)
	}

	// Capacity
	if point.Cap < 0 {
		failTest("%s: Invalid capacity %d (must be >= 0)", context, point.Cap)
	}

	// KwhPrice (checked in updpoint test: pm.expect(j.kwhprice).to.greaterThanOrEqual(0.0))
	if point.KwhPrice < 0 {
		failTest("%s: Invalid kwhprice %.2f (must be >= 0)", context, point.KwhPrice)
	}
}

// validateSession validates a session structure
// Matches Postman's validateSession(session, isCsv)
func validateSession(session Session, context string) {
	// Postman checks: starttime and endtime are strings (non-empty)
	if session.StartTime == "" {
		failTest("%s: Start time is empty", context)
	}
	if session.EndTime == "" {
		failTest("%s: End time is empty", context)
	}

	// Postman checks: numeric fields are numbers and not NaN
	if math.IsNaN(session.StartSOC) {
		failTest("%s: StartSOC is NaN", context)
	}
	if math.IsNaN(session.EndSOC) {
		failTest("%s: EndSOC is NaN", context)
	}
	if math.IsNaN(session.TotalKwh) {
		failTest("%s: TotalKwh is NaN", context)
	}
	if math.IsNaN(session.KwhPrice) {
		failTest("%s: KwhPrice is NaN", context)
	}
	if math.IsNaN(session.Amount) {
		failTest("%s: Amount is NaN", context)
	}

	// SOC range validation [0, 100]
	if session.StartSOC < 0 || session.StartSOC > 100 {
		failTest("%s: StartSOC %.2f out of range [0, 100]", context, session.StartSOC)
	}
	if session.EndSOC < 0 || session.EndSOC > 100 {
		failTest("%s: EndSOC %.2f out of range [0, 100]", context, session.EndSOC)
	}

	// Non-negative values
	if session.TotalKwh < 0 {
		failTest("%s: TotalKwh %.2f must be >= 0", context, session.TotalKwh)
	}
	if session.KwhPrice < 0 {
		failTest("%s: KwhPrice %.2f must be >= 0", context, session.KwhPrice)
	}
	if session.Amount < 0 {
		failTest("%s: Amount %.2f must be >= 0", context, session.Amount)
	}
}

// validateHistory validates a history record
// Matches Postman's validateHistory(record, isCsv)
func validateHistory(record HistoryRecord, context string) {
	// Postman: pm.expect(record).to.have.property("timeref") etc.
	if record.Timeref == "" {
		failTest("%s: Timeref is empty", context)
	}
	if record.OldState == "" {
		failTest("%s: OldState is empty", context)
	}
	if record.NewState == "" {
		failTest("%s: NewState is empty", context)
	}

	// Postman: pm.expect(record.timeref).to.be.a('string') — ensured by Go types

	// Postman: pm.expect(allowed, "Old State Value").to.include(record.old_state)
	if !contains(allowedStatuses, record.OldState) {
		failTest("%s: Invalid old_state '%s' (allowed: %v)", context, record.OldState, allowedStatuses)
	}
	// Postman: pm.expect(allowed, "New State Value").to.include(record.new_state)
	if !contains(allowedStatuses, record.NewState) {
		failTest("%s: Invalid new_state '%s' (allowed: %v)", context, record.NewState, allowedStatuses)
	}
}

// ============================================================================
// DATE/TIME VALIDATION
// ============================================================================

// isValidDateTimeFormat checks if timestamp matches "YYYY-MM-DD HH:MM"
// Matches Postman regex: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/
func isValidDateTimeFormat(timestamp string) bool {
	_, err := time.Parse("2006-01-02 15:04", timestamp)
	return err == nil
}

// isValidISO8601 checks if timestamp matches ISO 8601 format
// Matches Postman regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
func isValidISO8601(timestamp string) bool {
	formats := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05.000Z",
		"2006-01-02T15:04:05.000000Z",
	}

	for _, format := range formats {
		_, err := time.Parse(format, timestamp)
		if err == nil {
			return true
		}
	}

	return false
}

// isTimestampCloseToNow checks if "YYYY-MM-DD HH:MM" timestamp is within 1 minute of now
// Matches Postman: Math.abs(now.diff(serverTime, 'minutes')) < 1
func isTimestampCloseToNow(timestamp string) bool {
	// Use ParseInLocation with local timezone, matching Postman's moment() behavior
	serverTime, err := time.ParseInLocation("2006-01-02 15:04", timestamp, time.Local)
	if err != nil {
		return false
	}

	now := time.Now()
	diffMinutes := math.Abs(now.Sub(serverTime).Minutes())

	return diffMinutes < 1
}

// isTimestampCloseToNowISO checks if an ISO 8601 timestamp is within maxSeconds of now
// Matches Postman: Math.abs(now.diff(serverTime, 'seconds')) < 60
func isTimestampCloseToNowISO(timestamp string, maxSeconds float64) bool {
	formats := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05.000Z",
		"2006-01-02T15:04:05.000000Z",
	}

	for _, format := range formats {
		serverTime, err := time.Parse(format, timestamp)
		if err == nil {
			now := time.Now().UTC()
			diffSeconds := math.Abs(now.Sub(serverTime).Seconds())
			return diffSeconds < maxSeconds
		}
	}

	return false
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
