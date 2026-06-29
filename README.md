# 🟢 Real-Time URL Uptime Monitor

A highly responsive, production-ready application designed to securely monitor the uptime, latency, and health of critical web services and APIs. 

If a tracked website goes down or its response time spikes, background workers instantly detect the failure and stream the status change directly to the React dashboard via WebSockets without requiring a page refresh.

## 🌟 Key Features

*   **Multi-Tenant Authentication:** Secure JWT-based login allowing users to manage their own private fleet of monitors.
*   **Advanced Health Checks:** Beyond simple HTTP pings, configure **SSL Expiry** tracking, **TTFB** (Time to First Byte) latency tracking, and **Keyword Search** inside HTML payloads.
*   **Computed Metrics:** Automatically tracks aggregate metrics over a 30-day window, including **Error Rate** and **Downtime Duration**.
*   **Live Data Streaming:** Real-time dashboard updates via WebSockets for instant incident awareness.
*   **Enterprise-Grade Alerting State Machine:** Tracks `consecutive_failures` and `consecutive_successes` to debounce network hiccups, preventing false-positive alerts before officially declaring an Incident.
*   **Metrics API:** Dedicated analytical endpoints returning SLA reports (Uptime %, Error Pings, Outage Windows) across customizable horizons (24h, 7d, 30d).
*   **SSRF Protection:** Built-in DNS validation actively resolves target domains and strictly blocks pings to internal, loopback, or private IP addresses, securing the worker layer from Server-Side Request Forgery attacks.

## 🏗️ Technology Stack

The project is built around a continuous, real-time data loop across 5 core technologies:

*   **Frontend UI:** React, TypeScript, Vite, Framer Motion, Recharts
*   **REST API & WebSockets:** Python, FastAPI, Pydantic
*   **Background Workers:** Celery (Beat Scheduler & Solo/Prefork Worker)
*   **Message Broker:** Redis (Pub/Sub & Task Queue)
*   **Database:** PostgreSQL (asyncpg & psycopg2)

## 📡 Architecture (How Data Flows)

1. **React** sends a new URL payload (with configured check types) to **FastAPI**.
2. **FastAPI** saves the URL securely to the authenticated user in **PostgreSQL**.
3. Every 5 seconds, **Celery Beat** queries the database and drops ping instructions into **Redis**.
4. The **Celery Worker** pulls instructions from Redis, executes the multi-stage health checks (HTTP, SSL, TTFB, Keyword), runs the state machine to open/resolve Incidents, saves them back to PostgreSQL, and Publishes the final result to a Redis channel.
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
celery -A app.worker.celery_app worker --loglevel=info --pool=solo
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
