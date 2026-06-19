# 🟢 Real-Time URL Uptime Monitor

A highly responsive, production-ready application designed to securely monitor the uptime, latency, and health of critical web services and APIs. 

If a tracked website goes down or its response time spikes, background workers instantly detect the failure and stream the status change directly to the React dashboard via WebSockets without requiring a page refresh.

## 🌟 Key Features

*   **Multi-Tenant Authentication:** Secure JWT-based login allowing users to manage their own private fleet of monitors.
*   **Advanced Health Checks:** Beyond simple HTTP pings, configure **SSL Expiry** tracking, **TTFB** (Time to First Byte) latency tracking, and **Keyword Search** inside HTML payloads.
*   **Live Data Streaming:** Real-time dashboard updates via WebSockets for instant incident awareness.
*   **Historical SLA Reporting:** Dynamically compute and visualize uptime percentages and latency sparklines across customizable time windows (24 hours, 7 days, 30 days, 90 days).
*   **Incident Logging:** Persistent tracking of outages and degraded states for long-term reliability metrics.

## 🏗️ Technology Stack

The project is built around a continuous, real-time data loop across 5 core technologies:

*   **Frontend UI:** React, TypeScript, Vite, Framer Motion, Recharts
*   **REST API & WebSockets:** Python, FastAPI, JWT Authentication
*   **Background Workers:** Celery (Beat Scheduler & Worker)
*   **Message Broker:** Redis (Pub/Sub)
*   **Database:** PostgreSQL (asyncpg)

## 📡 Architecture (How Data Flows)

1. **React** sends a new URL payload (with configured check types) to **FastAPI** on Port 8000.
2. **FastAPI** saves the URL securely to the authenticated user in **PostgreSQL** on Port 5432.
3. Every 30 seconds, **Celery Beat** queries the database and drops ping instructions into **Redis** on Port 6379.
4. The **Celery Worker** pulls instructions from Redis, executes the multi-stage health checks (HTTP, SSL, TTFB, Keyword), records the metrics, saves them back to PostgreSQL (up to 2000 historic pings per URL), and Publishes the final result to a Redis channel.
5. **FastAPI** listens to the Redis channel and instantly shoots the payload over a permanent **WebSocket** connection back to the **React** dashboard.

## 🚀 Local Setup Instructions

### Run with Docker

The project can run as a full Docker Compose stack:

```bash
docker compose up --build -d
```

This starts PostgreSQL, Redis, FastAPI, Celery Worker, Celery Beat, and the Vite frontend.

Open the app at `http://localhost:5173`.
Backend docs are available at `http://localhost:8000/docs`.

To stop the stack:

```bash
docker compose down
```

### Manual setup

To run this project locally, you must have **PostgreSQL** and **Redis** (or Memurai on Windows) installed and running on your machine.

### 1. Start the Database and Message Broker
Ensure PostgreSQL is running on `localhost:5432` with the credentials configured in the `.env` file (Default: `postgres:postgres`).
Ensure Redis is running on `localhost:6379`.

### 2. Start the FastAPI Backend
Open Terminal 1:
```bash
cd backend
python -m venv .venv
# Activate the virtual environment
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Start the Celery Worker
Open Terminal 2:
```bash
cd backend
# Activate the virtual environment
celery -A app.worker.celery_app worker --loglevel=info
```

### 4. Start the Celery Beat Scheduler
Open Terminal 3:
```bash
cd backend
# Activate the virtual environment
celery -A app.worker.celery_app beat --loglevel=info
```

### 5. Start the React Frontend
Open Terminal 4:
```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173` to sign up, log in, and view the live dashboard!
