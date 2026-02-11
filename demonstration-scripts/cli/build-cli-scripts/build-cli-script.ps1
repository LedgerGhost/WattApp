# build-cli-script.ps1
# Build script for WattApp CLI Test Suite (PowerShell)
# Run from: cli-script\build-cli-scripts\

$APP_NAME = "WattApp CLI Test Suite"
$VERSION = "1.0.0"

Write-Host ""
Write-Host "Building $APP_NAME v$VERSION..." -ForegroundColor Cyan
Write-Host ""

# Output directory is the parent folder (cli-script)
$OUTPUT_DIR = ".."

# Copy required test data to output directory
Write-Host "Copying test data..." -ForegroundColor Yellow
Copy-Item "addpoints.csv" -Destination "$OUTPUT_DIR\" -Force

# Build binaries
Write-Host "Building Windows binary..." -ForegroundColor Yellow
$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -ldflags="-s -w" -o "$OUTPUT_DIR\cli-script.exe" .

Write-Host "Building macOS Intel binary..." -ForegroundColor Yellow
$env:GOOS = "darwin"
$env:GOARCH = "amd64"
go build -ldflags="-s -w" -o "$OUTPUT_DIR\cli-script-macos-intel" .

Write-Host "Building macOS Apple Silicon binary..." -ForegroundColor Yellow
$env:GOOS = "darwin"
$env:GOARCH = "arm64"
go build -ldflags="-s -w" -o "$OUTPUT_DIR\cli-script-macos-arm" .

Write-Host "Building Linux binary..." -ForegroundColor Yellow
$env:GOOS = "linux"
$env:GOARCH = "amd64"
go build -ldflags="-s -w" -o "$OUTPUT_DIR\cli-script-linux" .

# Reset environment variables
Remove-Item Env:\GOOS
Remove-Item Env:\GOARCH

Write-Host ""
Write-Host " Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Output files in cli-script\:" -ForegroundColor Cyan
Get-ChildItem "$OUTPUT_DIR\cli-script*" | Format-Table Name, Length -AutoSize
Write-Host ""