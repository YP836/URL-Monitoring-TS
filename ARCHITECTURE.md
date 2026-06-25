# Production Scaling Architecture

This document outlines the path from our MVP (100 monitors) to our target scale of 100,000 monitors. 
To understand the scale:
- **1,000 monitors @ 60s** = 16.7 checks/s = 1.44M rows/day in `ping_history`
- **100,000 monitors @ 60s** = 1,667 checks/s = 144M rows/day in `ping_history`

## Design Decisions & Scaling Path

### Why Current Design Suits MVP
Our FastAPI + Celery + PostgreSQL stack allows rapid development and leverages mature, well-understood Python tooling to comfortably handle our initial 100-monitor target without complex distributed systems.

### Why `next_check_at` + Dup-Prevention (Phase 1)
Using `FOR UPDATE SKIP LOCKED` guarantees exactly-once execution for due checks, preventing race conditions where multiple workers might ping the same URL simultaneously as our fleet grows.

### Why Async Workers Eventually
At 1,667 checks/sec, synchronous `pool=solo` workers will block entirely. We must transition to fully async workers (via `gevent`, `asyncio`, or a Go rewrite) to hold thousands of open TCP connections without spawning thousands of OS threads.

### Why Redis Pub/Sub Isn't Durable
Redis Pub/Sub is fire-and-forget; if a worker or client reconnects, messages are lost. As we scale, we must move to an append-only log like Redis Streams, RabbitMQ, SQS, or Kafka to ensure reliable delivery of incident triggers and alerts.

### Data Split Strategy
PostgreSQL excels at relational consistency but fails under 1,667 inserts/sec. We will keep users, monitors, and incidents in Postgres, but offload the massive `ping_history` (144M rows/day) to a Time-Series Database like ClickHouse or TimescaleDB.

### Why WebSocket Sends Only Status Changes (Phase 3)
Broadcasting 1,667 "ping completed" messages per second to connected clients would crash browsers and overwhelm the server. Limiting signals strictly to status changes keeps the WebSocket traffic extremely lightweight.

### Why False-Down Protection (Phase 2)
A single network blip shouldn't page an on-call engineer. Implementing a state machine that requires consecutive failures before transitioning to `DOWN` prevents alert fatigue.

### Why Multi-Region Probes
Target servers often block or rate-limit a single IP making thousands of requests. Distributing probes globally bypasses regional rate limits and provides true geographic latency metrics.

### Why SSRF Protection (Phase 5)
Without blocking private IPs (`169.254.169.254`, `127.0.0.1`), malicious users could add internal URLs to our system and use our Celery workers to port-scan our internal VPC or exfiltrate AWS metadata.
