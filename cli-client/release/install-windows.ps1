# install-windows.ps1
# Simple one-click installer for Windows

$AppName = "WattappCLI"
$Cliname = "se2537"
$BinaryName = "se2537.exe"
$InstallPath = "$env:C\Programs\$AppName\$Cliname"

# Simple header
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "  $AppName Installer" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Ask for permission
Write-Host "This will install $AppName to:" -ForegroundColor Yellow
Write-Host "  $InstallPath" -ForegroundColor White
Write-Host ""
Write-Host "and add it to your PATH so you can use it anywhere." -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Continue? (Y/N)"
if ($response -ne 'Y' -and $response -ne 'y') {
    Write-Host "Installation cancelled." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Installing..." -ForegroundColor Cyan

try {
    # Create directory
    if (-not (Test-Path $InstallPath)) {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }

    # Copy binary
    if (-not (Test-Path $BinaryName)) {
        Write-Host "Error: $BinaryName not found in current directory" -ForegroundColor Red
        Write-Host "Please run this script from the same folder as $BinaryName" -ForegroundColor Yellow
        exit 1
    }
    
    Copy-Item $BinaryName -Destination "$InstallPath\$BinaryName" -Force

    # Add to PATH (User level - no admin needed)
    $PathVariable = [Environment]::GetEnvironmentVariable("Path", "User")
    if (-not ($PathVariable -split ';' -contains $InstallPath)) {
        $NewPath = "$PathVariable;$InstallPath"
        [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
        
        # Update current session
        $env:Path = "$env:Path;$InstallPath"
    }

    # Success message
    Write-Host ""
    Write-Host "=================================" -ForegroundColor Green
    Write-Host "  Installation Successful!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now use $AppName from anywhere!" -ForegroundColor White
    Write-Host ""
    Write-Host "Try it now:" -ForegroundColor Cyan
    Write-Host "  $Cliname healthcheck" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Note: You may need to restart your terminal" -ForegroundColor Gray
    Write-Host "      for the PATH changes to take effect." -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "Installation failed: $_" -ForegroundColor Red
    exit 1
}