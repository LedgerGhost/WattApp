package main

// Response structures matching API

type HealthcheckResponse struct {
	Status               string `json:"status"`
	DBConnection         string `json:"dbconnection"`
	NChargePoints        int    `json:"n_charge_points"`
	NChargePointsOnline  int    `json:"n_charge_points_online"`
	NChargePointsOffline int    `json:"n_charge_points_offline"`
}

type ResetpointsResponse struct {
	Status              string `json:"status"`
	Info                string `json:"info"`
	TotalPointsImported int    `json:"total_points_imported"`
	SourceFile          string `json:"source_file"`
	Timeref             string `json:"timeref"`
}

type AddpointsResponse struct {
	Status         string `json:"status"`
	Info           string `json:"info"`
	PointsImported int    `json:"points_imported"`
	Timeref        string `json:"timeref"`
}

type Point struct {
	ProviderName string `json:"providername"`
	PointID      int    `json:"pointid"`
	Lon          string `json:"lon"`
	Lat          string `json:"lat"`
	Status       string `json:"status"`
	Cap          int    `json:"cap"`
}

type PointDetails struct {
	PointID            int     `json:"pointid"`
	Lon                string  `json:"lon"`
	Lat                string  `json:"lat"`
	Status             string  `json:"status"`
	Cap                int     `json:"cap"`
	ReservationEndTime string  `json:"reservationendtime"`
	KwhPrice           float64 `json:"kwhprice"`
}

type ReservationResponse struct {
	PointID            int    `json:"pointid"`
	Status             string `json:"status"`
	ReservationEndTime string `json:"reservationendtime"`
}

type UpdpointResponse struct {
	PointID  int     `json:"pointid"`
	Status   string  `json:"status"`
	KwhPrice float64 `json:"kwhprice"`
}

type Session struct {
	StartTime string  `json:"starttime"`
	EndTime   string  `json:"endtime"`
	StartSOC  float64 `json:"startsoc"`
	EndSOC    float64 `json:"endsoc"`
	TotalKwh  float64 `json:"totalkwh"`
	KwhPrice  float64 `json:"kwhprice"`
	Amount    float64 `json:"amount"`
}

type HistoryRecord struct {
	Timeref  string `json:"timeref"`
	OldState string `json:"old_state"`
	NewState string `json:"new_state"`
}

type StatusCounts struct {
	Available   int
	Charging    int
	Reserved    int
	Malfunction int
	Offline     int
}

// Error response structure
type ErrorResponse struct {
	Call       string `json:"call"`
	Timeref    string `json:"timeref"`
	Originator string `json:"originator"`
	ReturnCode int    `json:"return_code"`
	Error      string `json:"error"`
	Debuginfo  string `json:"debuginfo"`
}
