#!/bin/bash

# Create logs directory
mkdir -p logs
mkdir -p static

# Get absolute path to project root
PROJECT_ROOT=$(pwd)
LOGS_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Log file paths
SETUP_LOG="$LOGS_DIR/setup_$TIMESTAMP.log"
BACKEND_LOG="$LOGS_DIR/backend_$TIMESTAMP.log"
FRONTEND_LOG="$LOGS_DIR/frontend_$TIMESTAMP.log"

# Function for logging with timestamp
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo "$message" | tee -a "$SETUP_LOG"
}

log "=============================================================="
log "VyOS Configuration Viewer - Setup and Launch"
log "=============================================================="

# Kill existing screen sessions if they exist
if screen -list | grep -q "backend"; then
    log "Stopping existing backend screen session..."
    screen -X -S backend quit
fi

if screen -list | grep -q "frontend"; then
    log "Stopping existing frontend screen session..."
    screen -X -S frontend quit
fi

# Check if Python is installed
if ! command -v python3 &>/dev/null; then
    log "ERROR: Python 3 is not installed or not in PATH"
    log "Please install Python 3.8 or higher"
    exit 1
fi

# Check if screen is installed
if ! command -v screen &>/dev/null; then
    log "ERROR: screen is not installed or not in PATH"
    log "Please install screen to manage processes"
    exit 1
fi

# Check Python version
python_version=$(python3 --version | grep -oP '\d+\.\d+')
if (( $(echo "$python_version < 3.8" | bc -l) )); then
    log "WARNING: Python version ($python_version) may not be compatible"
    log "Recommended: Python 3.8 or higher"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    log "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        log "ERROR: Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment
log "Activating virtual environment..."
source venv/bin/activate

# Install requirements
log "Checking and installing dependencies..."
pip install -r requirements.txt 2>&1 | tee -a "$SETUP_LOG"
if [ $? -ne 0 ]; then
    log "ERROR: Failed to install dependencies"
    exit 1
fi

# Check if .env file exists and load it
if [ -f .env ]; then
    log "Loading environment variables from .env"
    export $(grep -v '^#' .env | xargs)
else
    log "WARNING: .env file not found. Creating from sample..."
    if [ -f .env.sample ]; then
        cp .env.sample .env
        log "Created .env from sample. Please edit it with your settings."
        ${EDITOR:-vi} .env
    else
        log "ERROR: .env.sample not found. Cannot create configuration."
        exit 1
    fi
fi

# Default values if not provided in .env
PORT=${PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
HOST=${HOST:-0.0.0.0}
WORKERS=${WORKERS:-1}  # Default to 1 worker to avoid duplicate processes
LOG_LEVEL=${LOG_LEVEL:-info}
ENVIRONMENT=${ENVIRONMENT:-development}

log "=============================================================="
log "Starting VyOS Configuration Viewer in $ENVIRONMENT mode..."
log "Host: $HOST"
log "Backend Port: $PORT"
log "Frontend Port: $FRONTEND_PORT"
log "Workers: $WORKERS"
log "Log Level: $LOG_LEVEL"
log "=============================================================="

# Backend setup with venv activation
VENV_PATH="$PROJECT_ROOT/venv"

# Create a backend startup script
BACKEND_SCRIPT="$PROJECT_ROOT/backend_start.sh"
cat > "$BACKEND_SCRIPT" << EOF
#!/bin/bash
cd "$PROJECT_ROOT"
source "$VENV_PATH/bin/activate"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting backend server..." >> "$BACKEND_LOG"
EOF

if [ "$ENVIRONMENT" = "production" ]; then
    echo "python -m uvicorn main:app --host $HOST --port $PORT --workers $WORKERS --log-level $LOG_LEVEL 2>&1 | tee -a \"$BACKEND_LOG\"" >> "$BACKEND_SCRIPT"
else
    echo "python -m uvicorn main:app --host $HOST --port $PORT --reload --log-level $LOG_LEVEL 2>&1 | tee -a \"$BACKEND_LOG\"" >> "$BACKEND_SCRIPT"
fi

chmod +x "$BACKEND_SCRIPT"

# Start backend in a named screen session
log "Starting backend in screen session 'backend'..."
screen -dmS backend bash -c "$BACKEND_SCRIPT; exec bash"

# Check if frontend directory exists
if [ -d "frontend" ]; then
    log "=============================================================="
    log "Checking Frontend prerequisites..."
    log "=============================================================="
    
    # Navigate to frontend directory
    cd frontend
    
    # Check if Node.js is installed
    if ! command -v node &>/dev/null; then
        log "ERROR: Node.js is not installed or not in PATH"
        log "Please install Node.js 16 or higher"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &>/dev/null; then
        log "ERROR: npm is not installed or not in PATH"
        log "Please install npm"
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist or package.json has changed
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log "Installing frontend dependencies..."
        npm install 2>&1 | tee -a "$SETUP_LOG"
        if [ $? -ne 0 ]; then
            log "ERROR: Failed to install frontend dependencies"
            exit 1
        fi
    fi
    
    # Stay in frontend directory
    FRONTEND_DIR="$PROJECT_ROOT/frontend"
    
    # Create a frontend startup script
    FRONTEND_SCRIPT="$PROJECT_ROOT/frontend_start.sh"
    cat > "$FRONTEND_SCRIPT" << EOF
#!/bin/bash
cd "$FRONTEND_DIR"
# Ensure frontend uses port 3000 regardless of PORT env variable
export PORT=$FRONTEND_PORT
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting frontend application on port $FRONTEND_PORT..." >> "$FRONTEND_LOG"
EOF

    if [ "$ENVIRONMENT" = "production" ]; then
        echo "npm run build && npm start 2>&1 | tee -a \"$FRONTEND_LOG\"" >> "$FRONTEND_SCRIPT"
    else
        echo "npm run dev 2>&1 | tee -a \"$FRONTEND_LOG\"" >> "$FRONTEND_SCRIPT"
    fi
    
    chmod +x "$FRONTEND_SCRIPT"
    
    # Start frontend in a named screen session
    log "Starting frontend in screen session 'frontend'..."
    screen -dmS frontend bash -c "$FRONTEND_SCRIPT; exec bash"
    
    # Go back to project root
    cd "$PROJECT_ROOT"
else
    log "Frontend directory not found. Skipping frontend startup."
fi

# Wait for services to start and check if they're running
sleep 3

# Verify backend is running
if ! screen -list | grep -q "backend"; then
    log "WARNING: Backend screen session not found. Check logs for errors."
else
    log "Backend running in screen session."
fi

# Verify frontend is running (if applicable)
if [ -d "frontend" ]; then
    if ! screen -list | grep -q "frontend"; then
        log "WARNING: Frontend screen session not found. Check logs for errors."
    else
        log "Frontend running in screen session."
    fi
fi

log "=============================================================="
log "All services started in screen sessions with logging:"
log "  - Backend: screen -r backend (logs: $BACKEND_LOG) - http://$HOST:$PORT"
log "  - Frontend: screen -r frontend (logs: $FRONTEND_LOG) - http://$HOST:$FRONTEND_PORT"
log "=============================================================="
log "Use 'screen -r <name>' to attach to a session"
log "Use 'Ctrl+A, D' to detach from a session"
log "Use 'screen -X -S <name> quit' to terminate a session"
log "Use 'tail -f logs/backend_*.log' to view backend logs"
log "Use 'tail -f logs/frontend_*.log' to view frontend logs"
log "=============================================================="

# Create a utility script to stop services
STOP_SCRIPT="$PROJECT_ROOT/stop.sh"
cat > "$STOP_SCRIPT" << 'EOF'
#!/bin/bash
echo "Stopping services..."
if screen -list | grep -q "backend"; then
    echo "Stopping backend screen session..."
    screen -X -S backend quit
fi

if screen -list | grep -q "frontend"; then
    echo "Stopping frontend screen session..."
    screen -X -S frontend quit
fi
echo "All services stopped."
EOF

chmod +x "$STOP_SCRIPT"
log "Created stop.sh script to easily stop all services." 