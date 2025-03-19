#!/bin/bash

echo "=============================================================="
echo "VyOS Configuration Viewer - Setup and Launch"
echo "=============================================================="

# Check if Python is installed
if ! command -v python3 &>/dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

# Check Python version
python_version=$(python3 --version | grep -oP '\d+\.\d+')
if (( $(echo "$python_version < 3.8" | bc -l) )); then
    echo "WARNING: Python version ($python_version) may not be compatible"
    echo "Recommended: Python 3.8 or higher"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "Checking and installing dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

# Check if .env file exists and load it
if [ -f .env ]; then
    echo "Loading environment variables from .env"
    export $(grep -v '^#' .env | xargs)
else
    echo "WARNING: .env file not found. Creating from sample..."
    if [ -f .env.sample ]; then
        cp .env.sample .env
        echo "Created .env from sample. Please edit it with your settings."
        ${EDITOR:-vi} .env
    else
        echo "ERROR: .env.sample not found. Cannot create configuration."
        exit 1
    fi
fi

# Default values if not provided in .env
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}
WORKERS=${WORKERS:-4}
ENVIRONMENT=${ENVIRONMENT:-development}

echo "=============================================================="
echo "Starting VyOS Configuration Viewer in $ENVIRONMENT mode..."
echo "Host: $HOST"
echo "Port: $PORT"
echo "=============================================================="

if [ "$ENVIRONMENT" = "production" ]; then
    echo "Running with Gunicorn on $HOST:$PORT with $WORKERS workers"
    gunicorn main:app -w $WORKERS -k uvicorn.workers.UvicornWorker -b $HOST:$PORT
else
    echo "Running with Uvicorn on $HOST:$PORT"
    uvicorn main:app --host $HOST --port $PORT --reload
fi

# If the app exits with an error, print a message
if [ $? -ne 0 ]; then
    echo "Application exited with error code $?"
    read -p "Press Enter to continue..."
fi 