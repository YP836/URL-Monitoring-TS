from celery import Celery

from ...app.config import settings


# Tasks will be registered in Phase 3
celery_app = Celery(
    "uptime_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
