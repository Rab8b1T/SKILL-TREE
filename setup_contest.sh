#!/bin/bash

echo "====================================="
echo "Virtual Contest System - Quick Setup"
echo "====================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

echo "[1/4] Checking Python installation..."
python3 --version
echo ""

# Check if requirements.txt exists
if [ ! -f requirements.txt ]; then
    echo "ERROR: requirements.txt not found"
    echo "Make sure you're in the SKILL TREE directory"
    exit 1
fi

echo "[2/4] Installing Python dependencies..."
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
echo "Dependencies installed successfully!"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "[3/4] Creating .env file from example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo ""
        echo "============================================"
        echo "IMPORTANT: Edit .env file with your MongoDB URI"
        echo "============================================"
        echo "1. Go to https://cloud.mongodb.com"
        echo "2. Create a free cluster"
        echo "3. Get connection string"
        echo "4. Edit .env file and paste your MongoDB URI"
        echo ""
        echo "Press Enter to open .env file..."
        read
        ${EDITOR:-nano} .env
    else
        echo "ERROR: .env.example not found"
        exit 1
    fi
else
    echo "[3/4] .env file already exists"
fi
echo ""

echo "[4/4] Setup complete!"
echo ""
echo "====================================="
echo "Next Steps:"
echo "====================================="
echo "1. Make sure .env has your MongoDB URI"
echo "2. Run: python3 contest_server.py"
echo "3. Open: contest/index.html in browser"
echo ""
echo "For detailed instructions, see:"
echo "- CONTEST_MONGODB_SETUP.md"
echo "- contest/README.md"
echo ""
echo "====================================="
echo "Press Enter to start the server..."
read

echo ""
echo "Starting Contest API Server..."
echo ""
python3 contest_server.py
