#!/bin/bash

# An interactive script to manage the full development environment.
#
# - It starts the backend and frontend servers as background processes.
# - It tails the backend server logs directly in the current terminal.
# - It remains active to accept commands:
#   - 'r' to restart both servers.
#   - 'k' or 'Ctrl+C' to kill all processes and exit.

echo "🚀 Starting development environment..."

# Get the absolute path of the directory where the script is located.
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
LOG_DIR="$SCRIPT_DIR/.logs"
BACKEND_LOG_FILE="$LOG_DIR/backend.log"
FRONTEND_LOG_FILE="$LOG_DIR/frontend.log"

# --- Port Configuration ---
# Read the port from the frontend's .env file to ensure a single source of truth.
ENV_FILE="$SCRIPT_DIR/frontend/.env"
CONFIG_PORT=""
if [ -f "$ENV_FILE" ]; then
    # Use grep to find the line and cut to extract the value after '='
    CONFIG_PORT=$(grep REACT_APP_API_PORT "$ENV_FILE" | cut -d '=' -f2)
fi
# Use the configured port or default to 8001
PORT=${CONFIG_PORT:-8001}

# --- Setup ---
# Create a directory for logs if it doesn't exist.
mkdir -p "$LOG_DIR"
# Clear the previous log file to ensure a fresh log on each start.
> "$BACKEND_LOG_FILE"
> "$FRONTEND_LOG_FILE"

echo "✅ Log files prepared in: $LOG_DIR"
echo "✅ Backend will be started on port: $PORT"

# --- Process Management Functions ---

start_backend() {
    echo "Starting backend..."
    (cd "$SCRIPT_DIR/backend" && source .venv/bin/activate && uvicorn main:app --reload --port "$PORT" &> "$BACKEND_LOG_FILE") &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
}

start_frontend() {
    echo "Starting frontend..."
    (cd "$SCRIPT_DIR/frontend" && npm start &> "$FRONTEND_LOG_FILE") &
    FRONTEND_PID=$!
    echo "Frontend started with PID: $FRONTEND_PID"
}

kill_processes() {
    echo "Killing processes..."
    # Kill the log tailing process
    if [ -n "$TAIL_PID" ]; then kill "$TAIL_PID" 2>/dev/null; fi

    # Kill backend by finding what's on the port, which is more reliable.
    BACKEND_PIDS_ON_PORT=$(lsof -t -i:"$PORT")
    if [ -n "$BACKEND_PIDS_ON_PORT" ]; then
        echo "Found backend process(es) on port $PORT: $BACKEND_PIDS_ON_PORT. Terminating..."
        # The PIDs are returned on separate lines, so we pass them to kill.
        kill -9 $BACKEND_PIDS_ON_PORT 2>/dev/null
    fi

    # Kill frontend and its children. pkill is more reliable for node scripts.
    if [ -n "$FRONTEND_PID" ]; then
        pkill -P "$FRONTEND_PID" 2>/dev/null
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    sleep 1 # Give OS time to release ports
}

# Trap to ensure cleanup on exit (Ctrl+C, etc.)
trap 'echo; echo "🛑 Shutting down..."; kill_processes; exit 0' SIGINT SIGTERM

# --- Initial Start ---
start_backend
start_frontend

sleep 2 # Give servers a moment to start up and write initial logs

# Start tailing the backend log in the background
tail -f "$BACKEND_LOG_FILE" &
TAIL_PID=$!

# --- Interactive Control Loop ---
echo
echo "✅ Environment is running. Tailing backend logs."
echo "   Press 'r' to restart services."
echo "   Press 'k' or Ctrl+C to kill all services and exit."
echo

while true; do
    # Read a single character, hide it, and don't require 'Enter'
    read -rsn1 input
    if [[ "$input" == "r" || "$input" == "R" ]]; then
        echo; echo "🔄 Restarting services..."
        kill_processes
        start_backend
        start_frontend
        sleep 2
        tail -f "$BACKEND_LOG_FILE" &
        TAIL_PID=$!
        echo "✅ Services restarted. Tailing backend logs..."
    elif [[ "$input" == "k" || "$input" == "K" ]]; then
        # The trap will handle the shutdown
        exit 0
    fi
done