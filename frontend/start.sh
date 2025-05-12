#!/bin/sh

# Create logs directory
mkdir -p logs

# Get absolute path to project root
PROJECT_ROOT=$(pwd)
LOGS_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Log file paths
FRONTEND_LOG="$LOGS_DIR/frontend_$TIMESTAMP.log"

# Function for logging with timestamp
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo "$message" | tee -a "$FRONTEND_LOG"
}

# If there is no .env file, try copying .env.example to .env
# After copying, check if .env file exists
if [ ! -f .env ]; then
    log "WARNING: No .env file found. Will use environment variables and defaults instead."
else
    # Load environment variables from .env
    export $(grep -v '^#' .env | xargs)
fi

# Default values if not provided in .env
FRONTEND_PORT=${FRONTEND_PORT:-3000}
NODE_ENV=${NODE_ENV:-development}
HOST=${HOST:-0.0.0.0}
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:3001}

log "=============================================================="
log "Checking Frontend prerequisites..."
log "=============================================================="
    
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
# if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
#     log "Installing frontend dependencies..."
#     npm install 2>&1 | tee -a "$SETUP_LOG"
#     if [ $? -ne 0 ]; then
#         log "ERROR: Failed to install frontend dependencies"
#         exit 1
#     fi
# fi

log "=============================================================="
log "Starting VyManager ui in $NODE_ENV mode..."
log "Host: $HOST"
log "Frontend Port: $FRONTEND_PORT"
log "Backend URL is: $NEXT_PUBLIC_API_URL"
log "=============================================================="

if [ "$NODE_ENV" = "production" ]; then
    npx next build && npx next start -p ${FRONTEND_PORT} -H :: 2>&1 | tee -a $FRONTEND_LOG
else
    npm run dev 2>&1 | tee -a $FRONTEND_LOG
fi