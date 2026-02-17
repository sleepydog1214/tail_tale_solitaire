@echo off
setlocal enabledelayedexpansion

REM --- Resolve adb from Android SDK ---
REM Try ANDROID_HOME first, then parse android/local.properties
set "ADB="
if defined ANDROID_HOME (
    set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
)

if not defined ADB (
    for /f "tokens=1,* delims==" %%A in ('findstr /b "sdk.dir" android\local.properties 2^>nul') do (
        set "SDK_RAW=%%B"
    )
    if defined SDK_RAW (
        set "SDK_RAW=!SDK_RAW: =!"
        set "SDK_RAW=!SDK_RAW:\:=:!"
        set "ADB=!SDK_RAW!\platform-tools\adb.exe"
    )
)

if not defined ADB (
    echo ERROR: Could not find adb. Set ANDROID_HOME or ensure android\local.properties has sdk.dir.
    exit /b 1
)

echo Using adb: !ADB!

call npm run android:sync
if !errorlevel! neq 0 exit /b !errorlevel!
call npm run android:build
if !errorlevel! neq 0 exit /b !errorlevel!
"!ADB!" install -r android\app\build\outputs\apk\debug\app-debug.apk
