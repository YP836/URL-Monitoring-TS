from celery import Celery
from celery.schedules import crontab

from app.config import settings

# Importing this module registers the Celery logging signal handler.
import app.worker.worker_logging  # noqa: F401


celery_app = Celery("uptime_worker")

celery_app.config_from_object(
    {
        "broker_url": settings.redis_url,
        "result_backend": settings.redis_url,
        "task_serializer": "json",
        "result_serializer": "json",
        "accept_content": ["json"],
        "timezone": "UTC",
        "enable_utc": True,
        "task_track_started": True,
        "task_acks_late": True,
        "worker_prefetch_multiplier": 1,
        "task_reject_on_worker_lost": True,
        "broker_connection_retry_on_startup": True,
        "broker_connection_max_retries": 10,
        "beat_schedule": {
            "schedule-all-pings": {
                "task": "app.worker.tasks.schedule_ping_tasks",
                "schedule": 30.0,
                "options": {"expires": 25},
            },
            "cleanup-old-pings": {
                "task": "app.worker.tasks.cleanup_old_pings",
                "schedule": crontab(hour=2, minute=0),
            },
        },
    }
)

celery_app.autodiscover_tasks(["app.worker"])
