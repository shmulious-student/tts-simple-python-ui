#!/bin/bash

# A helper script to kill any process on a given port and start the uvicorn server.
#
# Usage:
#   ./run.sh        (Kills process on port 8001 and starts server there)
#   ./run.sh 8001   (Kills process on port 8001 and starts server there)
#

# --- Port Configuration ---
# Read the port from the frontend's .env file to ensure a single source of truth.
ENV_FILE="../frontend/.env"
CONFIG_PORT=""
if [ -f "$ENV_FILE" ]; then
    # Use grep to find the line and cut to extract the value after '='
    CONFIG_PORT=$(grep REACT_APP_API_PORT "$ENV_FILE" | cut -d '=' -f2)
fi

# Set the port from the first argument ($1), or the config file, or default to 8001.
# The order of precedence is: command-line argument > .env file > hardcoded default.
PORT=${1:-${CONFIG_PORT:-8001}}

# --- Pre-flight Check: Ensure frontend is built ---
FRONTEND_DIR="../frontend/build"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "---"
    echo "❌ Error: Frontend build directory not found at '$FRONTEND_DIR'"
    echo "Please build the frontend application first."
    echo "You can likely do this by running the following commands from the project root:"
    echo ""
    echo "  cd ../frontend && npm install && npm run build"
    echo ""
    echo "Then, come back to the 'backend' directory and run this script again."
    echo "---"
    exit 1
fi

echo "--- Attempting to start server on port ${PORT} ---"

# Find the Process ID (PID) of the process using the specified port.
# The '-t' flag tells lsof to output only the PID, which is perfect for 'kill'.
PID=$(lsof -t -i:"${PORT}")

if [ -n "$PID" ]; then
  echo "Found existing process ${PID} on port ${PORT}. Terminating it..."
  kill -9 "${PID}"
  echo "Process ${PID} terminated."
  echo "Waiting a moment for the port to be released..."
  sleep 1
fi

echo "Starting Uvicorn server on http://127.0.0.1:${PORT}"
uvicorn main:app --reload --port "${PORT}"