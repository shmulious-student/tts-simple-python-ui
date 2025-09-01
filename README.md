# Text-to-Speech Web App

A web application for text-to-speech synthesis using Microsoft Edge's online TTS services. The app features a Python/FastAPI backend and a modern React frontend.

## Architecture

-   **Backend**: A `FastAPI` server written in Python that handles the text-to-speech synthesis logic by wrapping the `edge-tts` library. It exposes a simple REST API.
-   **Frontend**: A `React` single-page application (SPA) built with `Material-UI` for a professional and responsive user experience.

## Configuration

The backend API port can be configured in a single place, and both the frontend and backend will respect it.

-   **File**: `frontend/.env`
-   **Variable**: `REACT_APP_API_PORT`

The backend server automatically reads this value when you use the `backend/run.sh` script. The React development server also uses this value to make API calls.

If you change the port, you will need to restart both the backend and frontend servers.

## Development Setup

This project includes an interactive script to manage the entire development environment from a single terminal window.

The script will:
- Start the backend and frontend servers.
- Display the backend logs in real-time.
- Remain active to accept commands:
  - Press `r` to restart the servers.
  - Press `k` or `Ctrl+C` to stop everything.

1.  **Make the script executable (only needs to be done once):**
    ```bash
    chmod +x start-dev.sh
    ```

2.  **Run the interactive session from the project root:**
    ```bash
    ./start-dev.sh
    ```

### Manual Startup

If you prefer to run the services manually, you will need two separate terminals.

#### Terminal 1: Backend Server
```bash
cd backend
pip install -r requirements.txt # First time setup
uvicorn main:app --reload
```

#### Terminal 2: Frontend Server
```bash
cd frontend
npm install # First time setup
npm start
```

Your browser should automatically open to `http://localhost:3000`, where you can use the application.

## For Production

1.  Build the static React assets:
    ```bash
    cd frontend
    npm run build
    ```
2.  The FastAPI backend is already configured to serve these static files from the `frontend/build` directory. When you run the `uvicorn` server, you can access the entire application from `http://127.0.0.1:8000`.
