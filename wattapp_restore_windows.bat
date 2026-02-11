@echo off

setlocal enabledelayedexpansion

echo ==========================================
echo   WattApp Database Restore Script
echo ==========================================
echo.

REM ===========================================
REM CONFIGURATION - EDIT THESE SETTINGS
REM ===========================================

REM Option 1: Restore to LOCAL MongoDB (default)
REM Make sure MongoDB is running locally
set MONGO_URI=mongodb://localhost:27017/wattapp

REM Option 2: Restore to MongoDB Atlas (uncomment and edit)
REM set MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/wattapp

REM ===========================================

REM Determine dump folder path
if "%~1"=="" (
    set DUMP_FOLDER=.\dump
) else (
    set DUMP_FOLDER=%~1
)

REM Check if dump folder exists
if not exist "%DUMP_FOLDER%" (
    echo [ERROR] Dump folder not found: %DUMP_FOLDER%
    echo.
    echo Usage: wattapp_restore.bat [dump_folder_path]
    echo.
    echo Make sure you have the dump folder from the repository.
    echo If you cloned the repo, the dump folder should be in the project root.
    exit /b 1
)

REM Check if wattapp database folder exists inside dump
if not exist "%DUMP_FOLDER%\wattapp" (
    echo [ERROR] 'wattapp' database folder not found inside %DUMP_FOLDER%
    echo.
    echo Expected structure:
    echo   %DUMP_FOLDER%\
    echo   └── wattapp\
    echo       ├── collection1.bson
    echo       ├── collection1.metadata.json
    echo       └── ...
    exit /b 1
)

echo Dump folder: %DUMP_FOLDER%
echo Target database: %MONGO_URI%
echo.

REM Show what collections will be restored
echo Collections to restore:
for %%f in ("%DUMP_FOLDER%\wattapp\*.bson") do (
    echo   - %%~nf
)
echo.

REM Confirm before proceeding
echo [WARNING] This will DROP existing collections and replace them!
set /p confirm="Do you want to continue? (y/N): "

if /i not "%confirm%"=="y" (
    echo Restore cancelled.
    exit /b 0
)

echo.

REM Restore the database
echo Restoring database...
mongorestore --uri="%MONGO_URI%" --drop "%DUMP_FOLDER%"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] mongorestore failed!
    echo.
    echo Common issues:
    echo   1. MongoDB not running locally - start MongoDB service
    echo   2. mongorestore not in PATH - add MongoDB bin folder to PATH
    echo   3. Wrong connection URI - edit MONGO_URI in this script
    echo   4. Network issues if using Atlas
    exit /b 1
)

echo.
echo ==========================================
echo   Restore completed successfully!
echo ==========================================
echo.
echo Your WattApp database is now ready!
echo.
echo To verify, you can run:
echo   mongosh "%MONGO_URI%" --eval "db.getCollectionNames()"
echo.
echo Or connect with MongoDB Compass using:
echo   %MONGO_URI%

endlocal
