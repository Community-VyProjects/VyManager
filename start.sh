#!/bin/bash

echo "=============================================================="
echo "VyOS Configuration Viewer - Setup and Launch"
echo "=============================================================="
mkdir static
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

# Start backend server
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Running with Uvicorn on $HOST:$PORT"
    # Start backend in background
    python -m uvicorn main:app --host $HOST --port $PORT &
    BACKEND_PID=$!
fi

# Check if frontend directory exists
if [ -d "frontend" ]; then
    echo "=============================================================="
    echo "Starting Frontend application..."
    echo "=============================================================="
    
    # Navigate to frontend directory
    cd frontend
    
    # Check if Node.js is installed
    if ! command -v node &>/dev/null; then
        echo "ERROR: Node.js is not installed or not in PATH"
        echo "Please install Node.js 16 or higher"
        kill $BACKEND_PID  # Kill backend process
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &>/dev/null; then
        echo "ERROR: npm is not installed or not in PATH"
        echo "Please install npm"
        kill $BACKEND_PID  # Kill backend process
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist or package.json has changed
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to install frontend dependencies"
            kill $BACKEND_PID  # Kill backend process
            exit 1
        fi
    fi
    
    # Start frontend based on environment
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Building and starting frontend in production mode..."
        npm run build && npm start &
    else
        echo "Starting frontend in development mode..."
        npm run dev &
    fi
    
    FRONTEND_PID=$!
    cd ..  # Return to the root directory
    
    echo "Frontend started successfully!"
else
    echo "Frontend directory not found. Skipping frontend startup."
fi

echo "=============================================================="
echo "All services started. Press Ctrl+C to stop."
echo "=============================================================="

# Wait for user to press Ctrl+C and then cleanup
cleanup() {
    echo "Stopping services..."
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID
    fi
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID
    fi
    exit 0
}

trap cleanup INT TERM

# Keep script running until Ctrl+C is pressed
wait

# If the app exits with an error, print a message
if [ $? -ne 0 ]; then
    echo "Application exited with error code $?"
    read -p "Press Enter to continue..."
fi 