# build-installers.ps1
# Build script for Windows (PowerShell)

$APP_NAME = "WattappCLI"
$VERSION = "1.0.0"

Write-Host ""
Write-Host "Building installers for $APP_NAME v$VERSION..." -ForegroundColor Cyan
Write-Host ""

# Clean and create directories
if (Test-Path "release") {
    Remove-Item -Recurse -Force "release"
}
New-Item -ItemType Directory -Path "release" -Force | Out-Null

# Build binaries
Write-Host "Building Windows binary..." -ForegroundColor Yellow
$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -ldflags="-s -w" -o "release\se2537.exe" .

Write-Host "Building macOS Intel binary..." -ForegroundColor Yellow
$env:GOOS = "darwin"
$env:GOARCH = "amd64"
go build -ldflags="-s -w" -o "release\se2537-macos-intel" .

Write-Host "Building macOS Apple Silicon binary..." -ForegroundColor Yellow
$env:GOOS = "darwin"
$env:GOARCH = "arm64"
go build -ldflags="-s -w" -o "release\se2537-macos-arm" .

Write-Host "Building Linux binary..." -ForegroundColor Yellow
$env:GOOS = "linux"
$env:GOARCH = "amd64"
go build -ldflags="-s -w" -o "release\se2537-linux" .

# Reset environment variables
Remove-Item Env:\GOOS
Remove-Item Env:\GOARCH

Write-Host "Copying installer scripts..." -ForegroundColor Yellow
Copy-Item "installers\install-windows.ps1" -Destination "release\"
Copy-Item "installers\install-macos.sh" -Destination "release\"
Copy-Item "installers\install-linux.sh" -Destination "release\"

Write-Host ""
Write-Host " Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Upload these files to GitHub Releases:" -ForegroundColor Cyan
Get-ChildItem "release" | Format-Table Name, Length -AutoSize
Write-Host ""
Write-Host "Files ready in: release\" -ForegroundColor Green
Write-Host ""