@echo off
setlocal enabledelayedexpansion

REM === Remove unwanted folders from temp ===
echo Cleaning temp folder...

REM === Run clear backup first ===
call "C:\Users\Razan\Desktop\clear backup.bat"


REM === Get current date in YYMMDD format ===
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyMMdd"') do set "TODAY=%%a"

REM === Paths and Names ===
set "PROJECT_DIR=%cd%"
set "PARENT_DIR=%PROJECT_DIR%\.."
set "TEMP_DIR=%PARENT_DIR%\%TODAY%.temp"
set "ARCHIVE_NAME=%TODAY%.7z"
set "OUTPUT_FILE=%PARENT_DIR%\%ARCHIVE_NAME%"
set "SEVENZIP_PATH=C:\Program Files\7-Zip\7z.exe"

REM === Clean old temp folder if exists ===
if exist "%TEMP_DIR%" (
    echo Removing existing temp folder...
    rmdir /s /q "%TEMP_DIR%"
)

REM === Delete old archive if exists ===
if exist "%OUTPUT_FILE%" (
    echo Removing existing archive...
    del /q "%OUTPUT_FILE%"
)

REM === Create fresh temp folder ===
echo Creating temp folder...
mkdir "%TEMP_DIR%"

REM === Copy all project files into temp (exclude temp itself) ===
echo Copying project files...
xcopy "%PROJECT_DIR%\*" "%TEMP_DIR%\" /e /i /h /y /exclude:exclude-self.txt


REM === After backup finishes ===

set "TARGET=%TEMP_DIR%"

if exist "%TARGET%\node_modules" rmdir /s /q "%TARGET%\node_modules"
if exist "%TARGET%\android\app\build" rmdir /s /q "%TARGET%\android\app\build"
if exist "%TARGET%\android\build" rmdir /s /q "%TARGET%\android\build"
if exist "%TARGET%\ios\build" rmdir /s /q "%TARGET%\ios\build"
if exist "%TARGET%\ios\Pods" rmdir /s /q "%TARGET%\ios\Pods"

echo Temp folder is ready.

REM === Create archive ===
echo Creating 7z archive...
"%SEVENZIP_PATH%" a -t7z "%OUTPUT_FILE%" "%TEMP_DIR%" -mx=9

echo Archive created at: %OUTPUT_FILE%

REM === Remove temp folder ===
echo Cleaning up temp folder...
rmdir /s /q "%TEMP_DIR%"

echo Done!
pause
