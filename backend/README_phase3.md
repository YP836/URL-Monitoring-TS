# Phase 3: Celery Background Engine

Phase 3 adds a Celery worker, Celery Beat scheduler, synchronous URL ping tasks,
PostgreSQL ping history writes, URL status updates, and Redis Pub/Sub result
messages on the `ping_results` channel.

## Install Phase 3 Dependencies

```bash
cd uptime-monitor/backend
source venv/bin/activate
pip install psycopg2-binary==2.9.9
```

On Windows PowerShell, activate the local virtual environment with:

```powershell
cd C:\url_Monitoring\uptime-monitor\backend
.\.venv\Scripts\Activate.ps1
pip install psycopg2-binary==2.9.9
```

## Run Processes Manually

Terminal 1 - FastAPI:

```bash
uvicorn app.main:app --reload --port 8000
```

Terminal 2 - Celery worker:

```bash
celery -A app.worker.celery_app worker --loglevel=info --concurrency=2
```

Terminal 3 - Celery Beat scheduler:

```bash
celery -A app.worker.celery_app beat --loglevel=info
```

Terminal 4 - tests:

```bash
pytest tests/test_ping_task.py -v
```

## Run With a Procfile Manager

If you have honcho or overmind installed:

```bash
honcho start
```

or:

```bash
overmind start
```

## Verify Redis Pub/Sub

```bash
redis-cli subscribe ping_results
```
