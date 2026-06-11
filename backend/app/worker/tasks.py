"""Background tasks (Phase 3).

# Ping task will be implemented in Phase 3
"""

from .celery_app import celery_app


@celery_app.task
def _placeholder() -> None:
    return None
