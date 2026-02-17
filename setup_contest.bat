@echo off
echo =====================================
echo Virtual Contest System - Quick Setup
echo =====================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo [1/4] Checking Python installation...
python --version
echo.

REM Check if requirements.txt exists
if not exist requirements.txt (
    echo ERROR: requirements.txt not found
    echo Make sure you're in the SKILL TREE directory
    pause
    exit /b 1
)

echo [2/4] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully!
echo.

REM Check if .env exists
if not exist .env (
    echo [3/4] Creating .env file from example...
    if exist .env.example (
        copy .env.example .env
        echo.
        echo ============================================
        echo IMPORTANT: Edit .env file with your MongoDB URI
        echo ============================================
        echo 1. Go to https://cloud.mongodb.com
        echo 2. Create a free cluster
        echo 3. Get connection string
        echo 4. Edit .env file and paste your MongoDB URI
        echo.
        echo Press any key to open .env file in notepad...
        pause >nul
        notepad .env
    ) else (
        echo ERROR: .env.example not found
        pause
        exit /b 1
    )
) else (
    echo [3/4] .env file already exists
)
echo.

echo [4/4] Setup complete!
echo.
echo =====================================
echo Next Steps:
echo =====================================
echo 1. Make sure .env has your MongoDB URI
echo 2. Run: python contest_server.py
echo 3. Open: contest/index.html in browser
echo.
echo For detailed instructions, see:
echo - CONTEST_MONGODB_SETUP.md
echo - contest/README.md
echo.
echo =====================================
echo Press any key to start the server...
pause >nul

echo.
echo Starting Contest API Server...
echo.
python contest_server.py
