package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strconv" // Needed for converting string to float/int
	"strings" // Needed for trimming input

	"github.com/go-resty/resty/v2"
	"github.com/spf13/cobra"
)

// --- CONFIGURATION ---
const BaseURL = "http://localhost:9876/api" // Matches your backend port
const TokenFileName = ".softeng_token"

// Global variable for format flag
var formatParam string

// Add this near the top with your other structs
type LoginResponse struct {
	Token string `json:"token"` // Matches the key in your JSON response
}

// --- INTERACTIVE LOGIN ---
// This runs if the token file is missing
func interactiveLogin() error {
	reader := bufio.NewReader(os.Stdin)

	fmt.Println(" Provide your credentials to log in.")
	fmt.Println("-----------------------------------")

	// Ask for Email
	fmt.Print("Email: ")
	email, _ := reader.ReadString('\n')
	email = strings.TrimSpace(email)

	// Ask for Password
	fmt.Print("Password: ")
	pass, _ := reader.ReadString('\n')
	pass = strings.TrimSpace(pass)

	// Call the API
	fmt.Println("\nAuthenticating...")
	client := resty.New()
	resp, err := client.R().
		SetBody(map[string]string{"email": email, "password": pass}).
		Post(BaseURL + "/auth/login")

	if err != nil {
		return fmt.Errorf("Network error: %v", err)
	}
	if resp.StatusCode() != 200 {
		return fmt.Errorf("Login failed: %s", string(resp.Body()))
	}

	// Save the Token
	var result LoginResponse
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return fmt.Errorf("Parsing error: %v", err)
	}

	err = os.WriteFile(TokenFileName, []byte(result.Token), 0644)
	if err != nil {
		return fmt.Errorf("File save error: %v", err)
	}

	fmt.Println("Login Successful!")
	fmt.Println("-----------------------------------")
	return nil
}

// --- HTTP CLIENT ---
func getClient() *resty.Client {
	client := resty.New()

	// Read token from current directory
	// If missing, force interactive login
	tokenBytes, err := os.ReadFile(TokenFileName)
	// If error reading (e.g., file not found), force login
	if err != nil {
		// Run the interactive login function we wrote above
		loginErr := interactiveLogin()
		if loginErr != nil {
			fmt.Printf(" Critical Error: %v\n", loginErr)
			os.Exit(1) // Stop everything if login fails
		}
		// If login worked, read the file again!
		tokenBytes, _ = os.ReadFile(TokenFileName)
		token := string(tokenBytes)
		client.SetHeader("x-observatory-auth", token)
	} else if len(tokenBytes) > 0 {
		// If we read the token successfully, set it in the header
		client.SetHeader("x-observatory-auth", string(tokenBytes))
	}
	// Add "Middleware" to catch 401 errors or 403 errors
	client.OnAfterResponse(func(c *resty.Client, resp *resty.Response) error {
		// IF the server says "Unauthorized" (401)
		if Status := resp.StatusCode(); Status == 401 || Status == 403 {

			switch Status {
			case 401:
				fmt.Println("\n Session expired or invalid token.")
			case 403:
				fmt.Println("\n Access forbidden.\n Log in as administrator to continue.")
			}

			// Run the Interactive Login
			err := interactiveLogin()
			if err != nil {
				return err // Login failed? Return the error.
			}

			// Read the NEW token we just saved
			newTokenBytes, _ := os.ReadFile(TokenFileName)
			newToken := string(newTokenBytes)

			// Update the client for future requests
			c.SetHeader("x-observatory-auth", newToken)

			// Update the CURRENT failed request with the new token
			resp.Request.SetHeader("x-observatory-auth", newToken)

			// RETRY the request automatically!
			fmt.Println("Retrying command...")
			newResp, err := resp.Request.Execute(resp.Request.Method, resp.Request.URL) // ✅ Correct
			if err != nil {
				return err
			}

			//  Replace the old "401" response with the new "200" response
			//  so the rest of your code never knows it failed!
			*resp = *newResp
		}
		return nil
	})
	return client
}

// --- HELPER: OUTPUT ---
func printOutput(resp *resty.Response, err error) {
	if err != nil {
		fmt.Printf("Network Error: %v\n", err)
		os.Exit(1)
	}
	// Print raw body (API handles CSV/JSON generation)
	fmt.Println(string(resp.Body()))

	if resp.StatusCode() >= 400 {
		os.Exit(1)
	}
}

func main() {
	var rootCmd = &cobra.Command{
		Use:               "se2537",
		Short:             "WattApp Management CLI",
		CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},

		Run: func(cmd *cobra.Command, args []string) {
			cmd.Help()
		},
	}
	// Global flag --format (default: csv)
	// rootCmd.PersistentFlags().StringVar(&formatParam, "format", "csv", "Response format (json/csv)")

	// HEALTHCHECK (no params)
	var healthcheckCmd = &cobra.Command{
		Use:     "healthcheck",
		Short:   "Checks end-to-end connectivity between the CLI and the backend server",                          // Appears in the list of commands
		Long:    `Returns the connection string, number of charge points, number of online/offline charge points`, // Appears in list of parameters
		Example: `  se2537 healthcheck`,
		Run: func(cmd *cobra.Command, args []string) {
			// client := getClient()
			client := resty.New()
			resp, err := client.R().Get(BaseURL + "/admin/healthcheck")
			printOutput(resp, err)
		},
	}

	// RESETPOINTS (no params)
	var resetpointsCmd = &cobra.Command{
		Use:     "resetpoints",
		Short:   "Resets all charge points to the initial state", // Appears in the list of commands
		Long:    `Resets all charge points to the initial state`, // Appears in list of parameters
		Example: `  se2537 resetpoints`,
		Run: func(cmd *cobra.Command, args []string) {
			client := getClient()
			resp, err := client.R().SetQueryParam("format", formatParam).Post(BaseURL + "/admin/resetpoints")
			printOutput(resp, err)
		},
	}

	// ADDPOINTS (source is BOLD)
	var addpointsCmd = &cobra.Command{
		Use:     "addpoints",
		Short:   "Adds charge points from a CSV file", // Appears in the list of commands
		Long:    `Adds charge points from a CSV file`, // Appears in list of parameters
		Example: `  se2537 addpoints --source /path/to/points.csv`,
		Run: func(cmd *cobra.Command, args []string) {
			// if no flags provided, show help and exit
			// Example: se2537 addpoints
			if cmd.Flags().NFlag() == 0 {
				cmd.Help()
				os.Exit(0)
			}
			source, _ := cmd.Flags().GetString("source")
			if source == "" {
				fmt.Println("Error: required flag \"source\" not set")
				os.Exit(1)
			}
			if _, err := os.Stat(source); os.IsNotExist(err) {
				fmt.Printf("File not found: %s\n", source)
				os.Exit(1)
			}
			client := getClient()
			resp, err := client.R().
				SetFile("source", source).
				SetQueryParam("format", formatParam).
				Post(BaseURL + "/admin/addpoints")
			printOutput(resp, err)
		},
	}
	addpointsCmd.Flags().String("source", "", "Path to CSV file - REQUIRED")
	// addpointsCmd.MarkFlagRequired("source") // REQUIRED

	// POINTS (None bold)
	var pointsCmd = &cobra.Command{
		Use:   "points",
		Short: "Lists charge points",                                               // Appears in the list of commands
		Long:  `Returns a list of all charge points or all with the wanted status`, // Appears in list of parameters
		Example: `  se2537 points --status offline
  se2537 points --status online --format json`,
		Run: func(cmd *cobra.Command, args []string) {
			status, _ := cmd.Flags().GetString("status")
			// client := getClient()
			client := resty.New()
			req := client.R().SetQueryParam("format", formatParam)
			if status != "" {
				req.SetQueryParam("status", status)
			}
			resp, err := req.Get(BaseURL + "/points")
			printOutput(resp, err)
		},
	}
	pointsCmd.Flags().String("status", "", "Filter by status")

	// POINT (id is BOLD)
	var pointCmd = &cobra.Command{
		Use:     "point",
		Short:   "Get details of a specific point",                                                                                  // Appears in the list of commands
		Long:    `Returns the current status, capacity, and cost information for a specific charging point based on its unique ID.`, // Appears in list of parameters
		Example: `  se2537 point --id 45`,
		Run: func(cmd *cobra.Command, args []string) {
			// if no flags provided, show help and exit
			// Example: se2537 point
			if cmd.Flags().NFlag() == 0 {
				cmd.Help()
				os.Exit(0)
			}

			id, _ := cmd.Flags().GetString("id")

			if id == "" {
				fmt.Println("Error: required flag \"id\" not set")
				os.Exit(1)
			}
			// client := getClient()
			client := resty.New()
			resp, err := client.R().SetQueryParam("format", formatParam).Get(BaseURL + "/point/" + id)
			printOutput(resp, err)
		},
	}
	pointCmd.Flags().String("id", "", "Point ID - REQUIRED")
	// pointCmd.MarkFlagRequired("id") // REQUIRED

	// RESERVE (id is BOLD)
	var reserveCmd = &cobra.Command{
		Use:   "reserve",
		Short: "Reserves a charging point",                                                                                                                    // Appears in the list of commands
		Long:  `Reserves a charging point for a specified duration (default is 30 min, durations exceeding the maximum time are reduced to the maximum time)`, // Appears in list of parameters
		Example: `  se2537 reserve --id 2
  se2537 point --id 45 --minutes 60 `,
		Run: func(cmd *cobra.Command, args []string) {
			if cmd.Flags().NFlag() == 0 {
				cmd.Help()
				os.Exit(0)
			}

			id, _ := cmd.Flags().GetString("id")
			if id == "" {
				fmt.Println("Error: required flag \"id\" not set")
				os.Exit(1)
			}
			minutes, _ := cmd.Flags().GetString("minutes")
			url := BaseURL + "/reserve/" + id
			if minutes != "" {
				url += "/" + minutes
			}

			client := getClient()
			resp, err := client.R().SetQueryParam("format", formatParam).Post(url)
			printOutput(resp, err)
		},
	}
	reserveCmd.Flags().String("id", "", "Point ID")
	reserveCmd.Flags().String("minutes", "", "Duration in minutes")
	// reserveCmd.MarkFlagRequired("id") // REQUIRED

	// UPDPOINT (id is BOLD)
	var updpointCmd = &cobra.Command{
		Use:   "updpoint",
		Short: "Updates a charging point",                                                 // Appears in the list of commands
		Long:  `Updates status and kwh price (at least one) of a specific charging point`, // Appears in list of parameters
		Example: `  se2537 updpoint --id 2 --status available
  se2537 updpoint --id 45 --price 0.25 `,
		Run: func(cmd *cobra.Command, args []string) {
			if cmd.Flags().NFlag() == 0 {
				cmd.Help()
				os.Exit(0)
			}

			id, _ := cmd.Flags().GetString("id")
			status, _ := cmd.Flags().GetString("status")
			price, _ := cmd.Flags().GetString("price")

			// Validation: "mandatory id is provided"
			if id == "" {
				fmt.Println("Error: required flag \"id\" not set")
				os.Exit(1)
			}
			// Validation: "at least one of parameters status and price is provided"
			if status == "" && price == "" {
				fmt.Println("Error: You must provide either --status or --price")
				os.Exit(1)
			}

			body := map[string]interface{}{}
			if status != "" {
				body["status"] = status
			}
			if price != "" {
				p, _ := strconv.ParseFloat(price, 64)
				body["kwhprice"] = p
			}

			client := getClient()
			resp, err := client.R().
				SetBody(body).
				SetQueryParam("format", formatParam).
				Post(BaseURL + "/updpoint/" + id)
			printOutput(resp, err)
		},
	}
	updpointCmd.Flags().String("id", "", "Point ID")
	updpointCmd.Flags().String("status", "", "New status")
	updpointCmd.Flags().String("price", "", "New Price")
	// updpointCmd.MarkFlagRequired("id") // REQUIRED

	// NEWSESSION (ALL params are BOLD)
	var newsessionCmd = &cobra.Command{
		Use:     "newsession",
		Short:   "Records a new session",                                       // Appears in the list of commands
		Long:    `Records a new charging session with all required parameters`, // Appears in list of parameters
		Example: `  se2537 newsession --id 2 --starttime "2026-01-01 10:00" --endtime "2026-01-01 11:00" --startsoc 85 --endsoc 45 --totalkwh 45.5 --kwhprice 0.25 --amount 11.375`,
		Run: func(cmd *cobra.Command, args []string) {
			// if no flags provided, show help and exit
			// Example: se2537 newsession
			if cmd.Flags().NFlag() == 0 {
				cmd.Help()
				os.Exit(0)
			}
			// Gather flags
			id, _ := cmd.Flags().GetString("id")
			starttime, _ := cmd.Flags().GetString("starttime")
			endtime, _ := cmd.Flags().GetString("endtime")
			startsoc, _ := cmd.Flags().GetString("startsoc")
			endsoc, _ := cmd.Flags().GetString("endsoc")
			totalkwh, _ := cmd.Flags().GetString("totalkwh")
			kwhprice, _ := cmd.Flags().GetString("kwhprice")
			amount, _ := cmd.Flags().GetString("amount")

			// Validation: all required parameters are provided
			if id == "" || starttime == "" || endtime == "" || startsoc == "" || endsoc == "" || totalkwh == "" || kwhprice == "" || amount == "" {
				fmt.Println("Error: missing required flags. All parameters (id, starttime, endtime, startsoc, endsoc, totalkwh, kwhprice, amount) are mandatory.")
				os.Exit(1)
			}
			// Build payload
			payload := make(map[string]interface{})

			payload["pointid"] = id
			payload["starttime"] = starttime
			payload["endtime"] = endtime

			// Convert types for JSON Body
			if sSOC, err := strconv.ParseFloat(startsoc, 64); err == nil {
				payload["startsoc"] = sSOC
			} else {
				payload["startsoc"] = startsoc
			}
			if eSOC, err := strconv.ParseFloat(endsoc, 64); err == nil {
				payload["endsoc"] = eSOC
			} else {
				payload["endsoc"] = endsoc
			}
			if tKwh, err := strconv.ParseFloat(totalkwh, 64); err == nil {
				payload["totalkwh"] = tKwh
			} else {
				payload["totalkwh"] = totalkwh
			}
			if kPrice, err := strconv.ParseFloat(kwhprice, 64); err == nil {
				payload["kwhprice"] = kPrice
			} else {
				payload["kwhprice"] = kwhprice
			}
			if amt, err := strconv.ParseFloat(amount, 64); err == nil {
				payload["amount"] = amt
			} else {
				payload["amount"] = amount
			}

			client := getClient()
			resp, err := client.R().
				SetBody(payload).
				SetQueryParam("format", formatParam).
				Post(BaseURL + "/newsession")
			printOutput(resp, err)
		},
	}
	// Define all flags
	newsessionCmd.Flags().String("id", "", "Point ID")
	newsessionCmd.Flags().String("starttime", "", "Start Time")
	newsessionCmd.Flags().String("endtime", "", "End Time")
	newsessionCmd.Flags().String("startsoc", "", "Start SOC")
	newsessionCmd.Flags().String("endsoc", "", "End SOC")
	newsessionCmd.Flags().String("totalkwh", "", "Total kWh")
	newsessionCmd.Flags().String("kwhprice", "", "Price per kWh")
	newsessionCmd.Flags().String("amount", "", "Total Cost")

	// Mark ALL as required
	// newsessionCmd.MarkFlagRequired("id")
	// newsessionCmd.MarkFlagRequired("starttime")
	// newsessionCmd.MarkFlagRequired("endtime")
	// newsessionCmd.MarkFlagRequired("startsoc")
	// newsessionCmd.MarkFlagRequired("endsoc")
	// newsessionCmd.MarkFlagRequired("totalkwh")
	// newsessionCmd.MarkFlagRequired("kwhprice")
	// newsessionCmd.MarkFlagRequired("amount")

	// SESSIONS (id, from, to are BOLD)
	var sessionsCmd = &cobra.Command{
		Use:   "sessions",
		Short: "Lists charging sessions",                                      // Appears in the list of commands
		Long:  `Lists charging sessions for a specific point and time period`, // Appears in list of parameters
		Example: `  se2537 sessions --id 2 --from 20260101 --to 20260131
  se2537 sessions --id 45 --from 20260101 --to 20260131 --format json`,
		Run: func(cmd *cobra.Command, args []string) {
			if cmd.Flags().NFlag() == 0 {
				cmd.Help()
				os.Exit(0)
			}
			id, _ := cmd.Flags().GetString("id")
			from, _ := cmd.Flags().GetString("from")
			to, _ := cmd.Flags().GetString("to")

			if id == "" || from == "" || to == "" {
				fmt.Println("Error: missing required flags. All parameters (id, from, to) are mandatory.")
				os.Exit(1)
			}

			// client := getClient()
			client := resty.New()
			resp, err := client.R().
				SetQueryParam("format", formatParam).
				Get(fmt.Sprintf("%s/sessions/%s/%s/%s", BaseURL, id, from, to))
			printOutput(resp, err)
		},
	}
	sessionsCmd.Flags().String("id", "", "Point ID")
	sessionsCmd.Flags().String("from", "", "From Date (YYYYMMDD)")
	sessionsCmd.Flags().String("to", "", "To Date (YYYYMMDD)")
	// sessionsCmd.MarkFlagRequired("id")   // REQUIRED
	// sessionsCmd.MarkFlagRequired("from") // REQUIRED
	// sessionsCmd.MarkFlagRequired("to")   // REQUIRED

	// POINTSTATUS (id, from, to are BOLD)
	var pointstatusCmd = &cobra.Command{
		Use:   "pointstatus",
		Short: "Lists changes of charge points status",                                      // Appears in the list of commands
		Long:  `Lists changes of charge points status for a specific point and time period`, // Appears in list of parameters
		Example: `  se2537 pointstatus --id 2 --from 20260101 --to 20260131
  se2537 pointstatus --id 45 --from 20260101 --to 20260131 --format json`,
		Run: func(cmd *cobra.Command, args []string) {
			if cmd.Flags().NFlag() == 0 {
				cmd.Help()
				os.Exit(0)
			}
			id, _ := cmd.Flags().GetString("id")
			from, _ := cmd.Flags().GetString("from")
			to, _ := cmd.Flags().GetString("to")

			if id == "" || from == "" || to == "" {
				fmt.Println("Error: missing required flags. All parameters (id, from, to) are mandatory.")
				os.Exit(1)
			}

			// client := getClient()
			client := resty.New()
			resp, err := client.R().
				SetQueryParam("format", formatParam).
				Get(fmt.Sprintf("%s/pointstatus/%s/%s/%s", BaseURL, id, from, to))
			printOutput(resp, err)
		},
	}
	pointstatusCmd.Flags().String("id", "", "Point ID")
	pointstatusCmd.Flags().String("from", "", "From Date (YYYYMMDD)")
	pointstatusCmd.Flags().String("to", "", "To Date (YYYYMMDD)")
	// pointstatusCmd.MarkFlagRequired("id")   // REQUIRED
	// pointstatusCmd.MarkFlagRequired("from") // REQUIRED
	// pointstatusCmd.MarkFlagRequired("to")   // REQUIRED

	// LOGIN
	var loginCmd = &cobra.Command{
		Use:     "login",
		Short:   "Login to the system", // Appears in the list of commands
		Long:    `Login to the system`, // Appears in list of parameters
		Example: `  se2537 login --email user@example.com --passw password123`,
		Run: func(cmd *cobra.Command, args []string) {
			email, _ := cmd.Flags().GetString("email")
			pass, _ := cmd.Flags().GetString("passw")

			client := resty.New()
			resp, err := client.R().
				SetBody(map[string]string{"email": email, "password": pass}).
				Post(BaseURL + "/auth/login")

			if err != nil {
				fmt.Println("Error:", err)
				return
			}
			// Check for Error Status
			if resp.StatusCode() != 200 {
				fmt.Println("Login Failed:", string(resp.Body()))
				os.Exit(1)
			}
			// Save token to .softeng_token
			// Parse JSON to get the token string
			var result LoginResponse
			// This takes the raw text and forces it into the struct
			if err := json.Unmarshal(resp.Body(), &result); err != nil {
				fmt.Println("Failed to parse response:", err)
				return
			}
			err = os.WriteFile(TokenFileName, []byte(result.Token), 0644)
			if err != nil {
				fmt.Println("Failed to save token file:", err)
				return
			}

			fmt.Println("Login Successful!")
			fmt.Printf("Token saved to: %s\n", TokenFileName)
		},
	}
	loginCmd.Flags().String("email", "", "Email")
	loginCmd.Flags().String("passw", "", "Password")
	loginCmd.MarkFlagRequired("email")
	loginCmd.MarkFlagRequired("passw")

	// LOGOUT
	var logoutCmd = &cobra.Command{
		Use:     "logout",
		Short:   "Logout from the system",
		Long:    `Logs out the current user by removing the local authentication token.`,
		Example: `  se2537 logout`,
		Run: func(cmd *cobra.Command, args []string) {

			tokenBytes, err := os.ReadFile(TokenFileName)
			if err != nil {
				// If file doesn't exist, we are already logged out locally
				fmt.Println("No local session found (You are already logged out).")
				return
			}
			token := string(tokenBytes)
			// Notify Backend to invalidate session
			client := resty.New()
			resp, err := client.R().
				SetHeader("x-observatory-auth", token). // Manually set header
				Post(BaseURL + "/auth/logout")

			// Print the Server Response
			if err != nil {
				fmt.Println("Network Error: \n", err)
			} else {
				if resp.StatusCode() != 200 {
					fmt.Printf("Server Logout Failed: \n%s\n", string(resp.Body()))
				} else {
					fmt.Printf("Server Logout Successful: \n%s\n", string(resp.Body()))
				}
			}

			// Delete the file regardless of server response
			// (We want to ensure the user is logged out locally even if server fails)
			err = os.Remove(TokenFileName)
			if err == nil {
				fmt.Println("Local token file deleted. Logout locally successful.")
			}
		},
	}

	// Put every command that needs the --format flag here
	myCommands := []*cobra.Command{
		pointsCmd,
		sessionsCmd,
		pointstatusCmd,
	}
	// Add the --format flag to each of the commands above
	for _, cmd := range myCommands {
		// This makes it a "Local" flag, so it appears under "Flags" (not Global)
		cmd.Flags().StringVar(&formatParam, "format", "csv", "Response format (json/csv)")
	}

	// REGISTER COMMANDS
	rootCmd.AddCommand(
		healthcheckCmd, resetpointsCmd, addpointsCmd,
		pointsCmd, pointCmd, reserveCmd, updpointCmd,
		newsessionCmd, sessionsCmd, pointstatusCmd,
		loginCmd, logoutCmd,
	)

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
