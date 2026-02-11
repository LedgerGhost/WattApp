package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// isJSON checks if the output looks like JSON (object or array)
func isJSON(s string) bool {
	trimmed := strings.TrimSpace(s)
	return (strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "["))
}

func parseCSVPoints(csvText string) []Point {
	// Auto-detect JSON
	if isJSON(csvText) {
		return parseJSONPoints(csvText)
	}

	reader := csv.NewReader(strings.NewReader(csvText))
	records, err := reader.ReadAll()
	if err != nil {
		failTest("Failed to parse CSV: %v", err)
	}

	if len(records) < 2 {
		return []Point{}
	}

	// Skip header row
	var points []Point
	for i := 1; i < len(records); i++ {
		row := records[i]
		if len(row) < 6 {
			continue
		}

		pointID, _ := strconv.Atoi(strings.TrimSpace(row[1]))
		cap, _ := strconv.Atoi(strings.TrimSpace(row[5]))

		point := Point{
			ProviderName: strings.TrimSpace(row[0]),
			PointID:      pointID,
			Lon:          strings.TrimSpace(row[2]),
			Lat:          strings.TrimSpace(row[3]),
			Status:       strings.TrimSpace(row[4]),
			Cap:          cap,
		}
		points = append(points, point)
	}

	return points
}

func parseJSONPoints(jsonText string) []Point {
	var points []Point
	if err := json.Unmarshal([]byte(jsonText), &points); err != nil {
		failTest("Failed to parse JSON points: %v", err)
	}
	return points
}

func parseCSVPointDetails(csvText string) PointDetails {
	// Auto-detect JSON
	if isJSON(csvText) {
		return parseJSONPointDetails(csvText)
	}

	reader := csv.NewReader(strings.NewReader(csvText))
	records, err := reader.ReadAll()
	if err != nil {
		failTest("Failed to parse CSV: %v", err)
	}

	if len(records) < 2 {
		failTest("No data in CSV response")
	}

	row := records[1]
	if len(row) < 7 {
		failTest("Incomplete CSV row")
	}

	pointID, _ := strconv.Atoi(strings.TrimSpace(row[0]))
	cap, _ := strconv.Atoi(strings.TrimSpace(row[4]))
	kwhPrice, _ := strconv.ParseFloat(strings.TrimSpace(row[6]), 64)

	return PointDetails{
		PointID:            pointID,
		Lon:                strings.TrimSpace(row[1]),
		Lat:                strings.TrimSpace(row[2]),
		Status:             strings.TrimSpace(row[3]),
		Cap:                cap,
		ReservationEndTime: strings.TrimSpace(row[5]),
		KwhPrice:           kwhPrice,
	}
}

func parseJSONPointDetails(jsonText string) PointDetails {
	var details PointDetails
	if err := json.Unmarshal([]byte(jsonText), &details); err != nil {
		failTest("Failed to parse JSON point details: %v", err)
	}
	return details
}

func parseCSVReservation(csvText string) ReservationResponse {
	// Auto-detect JSON
	if isJSON(csvText) {
		return parseJSONReservation(csvText)
	}

	reader := csv.NewReader(strings.NewReader(csvText))
	records, err := reader.ReadAll()
	if err != nil {
		failTest("Failed to parse CSV: %v", err)
	}

	if len(records) < 2 {
		failTest("No data in CSV response")
	}

	row := records[1]
	if len(row) < 3 {
		failTest("Incomplete CSV row")
	}

	pointID, _ := strconv.Atoi(strings.TrimSpace(row[0]))

	return ReservationResponse{
		PointID:            pointID,
		Status:             strings.TrimSpace(row[1]),
		ReservationEndTime: strings.TrimSpace(row[2]),
	}
}

func parseJSONReservation(jsonText string) ReservationResponse {
	var resp ReservationResponse
	if err := json.Unmarshal([]byte(jsonText), &resp); err != nil {
		failTest("Failed to parse JSON reservation: %v", err)
	}
	return resp
}

func parseCSVUpdpoint(csvText string) UpdpointResponse {
	// Auto-detect JSON
	if isJSON(csvText) {
		return parseJSONUpdpoint(csvText)
	}

	reader := csv.NewReader(strings.NewReader(csvText))
	records, err := reader.ReadAll()
	if err != nil {
		failTest("Failed to parse CSV: %v", err)
	}

	if len(records) < 2 {
		failTest("No data in CSV response")
	}

	row := records[1]
	if len(row) < 3 {
		failTest("Incomplete CSV row")
	}

	pointID, _ := strconv.Atoi(strings.TrimSpace(row[0]))
	kwhPrice, _ := strconv.ParseFloat(strings.TrimSpace(row[2]), 64)

	return UpdpointResponse{
		PointID:  pointID,
		Status:   strings.TrimSpace(row[1]),
		KwhPrice: kwhPrice,
	}
}

func parseJSONUpdpoint(jsonText string) UpdpointResponse {
	var resp UpdpointResponse
	if err := json.Unmarshal([]byte(jsonText), &resp); err != nil {
		failTest("Failed to parse JSON updpoint: %v", err)
	}
	return resp
}

func parseCSVSessions(csvText string) []Session {
	// Auto-detect JSON
	if isJSON(csvText) {
		return parseJSONSessions(csvText)
	}

	reader := csv.NewReader(strings.NewReader(csvText))
	records, err := reader.ReadAll()
	if err != nil {
		failTest("Failed to parse CSV: %v", err)
	}

	if len(records) < 2 {
		return []Session{}
	}

	var sessions []Session
	for i := 1; i < len(records); i++ {
		row := records[i]
		if len(row) < 7 {
			continue
		}

		startSOC, _ := strconv.ParseFloat(strings.TrimSpace(row[2]), 64)
		endSOC, _ := strconv.ParseFloat(strings.TrimSpace(row[3]), 64)
		totalKwh, _ := strconv.ParseFloat(strings.TrimSpace(row[4]), 64)
		kwhPrice, _ := strconv.ParseFloat(strings.TrimSpace(row[5]), 64)
		amount, _ := strconv.ParseFloat(strings.TrimSpace(row[6]), 64)

		session := Session{
			StartTime: strings.TrimSpace(row[0]),
			EndTime:   strings.TrimSpace(row[1]),
			StartSOC:  startSOC,
			EndSOC:    endSOC,
			TotalKwh:  totalKwh,
			KwhPrice:  kwhPrice,
			Amount:    amount,
		}
		sessions = append(sessions, session)
	}

	return sessions
}

func parseJSONSessions(jsonText string) []Session {
	var sessions []Session
	if err := json.Unmarshal([]byte(jsonText), &sessions); err != nil {
		failTest("Failed to parse JSON sessions: %v", err)
	}
	return sessions
}

func parseCSVHistory(csvText string) []HistoryRecord {
	// Auto-detect JSON
	if isJSON(csvText) {
		return parseJSONHistory(csvText)
	}

	reader := csv.NewReader(strings.NewReader(csvText))
	records, err := reader.ReadAll()
	if err != nil {
		failTest("Failed to parse CSV: %v", err)
	}

	if len(records) < 2 {
		return []HistoryRecord{}
	}

	var history []HistoryRecord
	for i := 1; i < len(records); i++ {
		row := records[i]
		if len(row) < 3 {
			continue
		}

		record := HistoryRecord{
			Timeref:  strings.TrimSpace(row[0]),
			OldState: strings.TrimSpace(row[1]),
			NewState: strings.TrimSpace(row[2]),
		}
		history = append(history, record)
	}

	return history
}

func parseJSONHistory(jsonText string) []HistoryRecord {
	var history []HistoryRecord
	if err := json.Unmarshal([]byte(jsonText), &history); err != nil {
		failTest("Failed to parse JSON history: %v", err)
	}
	return history
}

func calculateStatusCounts(points []Point) StatusCounts {
	counts := StatusCounts{}

	for _, point := range points {
		switch point.Status {
		case "available":
			counts.Available++
		case "charging":
			counts.Charging++
		case "reserved":
			counts.Reserved++
		case "malfunction":
			counts.Malfunction++
		case "offline":
			counts.Offline++
		}
	}

	return counts
}

func (sc StatusCounts) String() string {
	return fmt.Sprintf("Available: %d, Charging: %d, Reserved: %d, Malfunction: %d, Offline: %d",
		sc.Available, sc.Charging, sc.Reserved, sc.Malfunction, sc.Offline)
}
