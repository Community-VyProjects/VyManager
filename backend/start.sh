#!/bin/bash

BACKEND_LOG=${BACKEND_LOG:-backend.log}

# Function for logging with timestamp
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo "$message" | tee -a "$BACKEND_LOG"
}

# Check if .env file exists
if [ ! -f .env ]; then
    log "WARNING: No .env file found. will use environment variables and default instead."
else 
    # Load environment variables from .env
    log "INFO: Reading environment variables from .env file"
    export $(grep -v '^#' .env | xargs)
fi

# Default values if not provided in .env
BACKEND_PORT=${BACKEND_PORT:-3001}
HOST=${HOST:-0.0.0.0}
WORKERS=${WORKERS:-1}  # Default to 1 worker to avoid duplicate processes
LOG_LEVEL=${LOG_LEVEL:-info}
ENVIRONMENT=${ENVIRONMENT:-development}
BACKEND_LOG=${BACKEND_LOG:-backend.log}

# Check if python is installed and version is 3.8 or higher
python_version=$(python --version | grep -oP '\d+\.\d+')
python_major_version=$(echo "$python_version" | cut -d '.' -f 1)
python_minor_version=$(echo "$python_version" | cut -d '.' -f 2)
if [ -z "$python_version" ]; then
    log "ERROR: Python is not installed or not found in PATH"
    exit 1
fi
if [ "$python_major_version" -lt 3 ] || { [ "$python_major_version" -eq 3 ] && [ "$python_minor_version" -lt 8 ]; }; then
    log "ERROR: Python version ($python_version) may not be compatible"
    log "Recommended: Python 3.8 or higher"
    exit 1
fi

# Execute uvicorn command
log "=============================================================="
log "Starting VyManager in $ENVIRONMENT mode..."
log "Host: $HOST"
log "Backend Port: $BACKEND_PORT"
log "Workers: $WORKERS"
log "Log Level: $LOG_LEVEL"
log "=============================================================="

if [ "$ENVIRONMENT" = "production" ]; then
  python -m uvicorn main:app --host $HOST --port $BACKEND_PORT --workers $WORKERS --log-level $LOG_LEVEL 2>&1 | tee -a $BACKEND_LOG
else
  python -m uvicorn main:app --host $HOST --port $BACKEND_PORT --reload --log-level $LOG_LEVEL 2>&1 | tee -a $BACKEND_LOG
fi