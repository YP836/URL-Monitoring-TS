import json
import logging
import time
from datetime import datetime
from typing import Any

import httpx
import redis

from app.config import settings
from app.worker.celery_app import celery_app


logger = logging.getLogger(__name__)


def _get_sync_conn():
    import psycopg2

    return psycopg2.connect(settings.database_url)


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _write_ping_result(
    url_id: int,
    status: str,
    response_time_ms: int | None,
    status_code: int | None,
    is_up: bool,
) -> None:
    conn = None
    try:
        conn = _get_sync_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ping_history
                    (url_id, checked_at, response_time_ms, status_code, is_up)
                VALUES (%s, NOW(), %s, %s, %s)
                """,
                (url_id, response_time_ms, status_code, is_up),
            )
            cur.execute(
                "UPDATE urls SET status = %s WHERE id = %s",
                (status, url_id),
            )
        conn.commit()
    except Exception:
        logger.exception("[ping_url] Failed to write ping result url_id=%s", url_id)
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                logger.exception("[ping_url] Failed to rollback url_id=%s", url_id)
    finally:
        if conn is not None:
            conn.close()


def _publish_ping_result(payload: dict[str, Any]) -> None:
    client = None
    try:
        client = redis.from_url(settings.redis_url)
        client.publish("ping_results", json.dumps(payload))
    except Exception:
        logger.exception(
            "[ping_url] Failed to publish Redis result url_id=%s",
            payload["url_id"],
        )
    finally:
        if client is not None:
            client.close()


@celery_app.task(
    bind=True,
    name="app.worker.tasks.ping_url",
    max_retries=3,
    default_retry_delay=10,
    soft_time_limit=15,
    time_limit=20,
)
def ping_url(self, url_id: int, web_address: str) -> dict:
    start = time.monotonic()
    timeout = httpx.Timeout(connect=5.0, read=8.0, write=5.0, pool=5.0)

    try:
        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "UptimeMonitor/1.0"},
        ) as client:
            response = client.get(web_address)
        response_time_ms = int((time.monotonic() - start) * 1000)
        status_code = response.status_code
        is_up = 200 <= status_code < 400
    except (
        httpx.TimeoutException,
        httpx.ConnectError,
        httpx.TooManyRedirects,
    ):
        response_time_ms = None
        status_code = None
        is_up = False
    except httpx.HTTPError as exc:
        raise self.retry(exc=exc)

    status = "UP" if is_up else "DOWN"
    payload = {
        "url_id": url_id,
        "status": status,
        "latency_ms": response_time_ms,
        "status_code": status_code,
        "checked_at": _utc_timestamp(),
    }

    _write_ping_result(
        url_id=url_id,
        status=status,
        response_time_ms=response_time_ms,
        status_code=status_code,
        is_up=is_up,
    )
    _publish_ping_result(payload)

    logger.info(
        "[ping_url] url_id=%s status=%s latency=%sms",
        url_id,
        status,
        response_time_ms,
    )
    return payload


@celery_app.task(name="app.worker.tasks.schedule_ping_tasks")
def schedule_ping_tasks() -> dict:
    conn = None
    try:
        conn = _get_sync_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT id, web_address FROM urls")
            rows = cur.fetchall()
    except Exception:
        logger.exception("[schedule_ping_tasks] Failed to fetch URLs")
        rows = []
    finally:
        if conn is not None:
            conn.close()

    count = 0
    for row in rows:
        url_id = row["id"] if isinstance(row, dict) else row[0]
        web_address = row["web_address"] if isinstance(row, dict) else row[1]
        ping_url.apply_async(args=[url_id, web_address], expires=25)
        count += 1

    logger.info("[schedule_ping_tasks] Enqueued %s ping tasks", count)
    return {"enqueued": count, "timestamp": datetime.utcnow().isoformat()}


@celery_app.task(name="app.worker.tasks.cleanup_old_pings")
def cleanup_old_pings() -> dict:
    conn = None
    deleted_rows = 0
    try:
        conn = _get_sync_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM ping_history
                WHERE checked_at < NOW() - INTERVAL '30 days'
                """
            )
            deleted_rows = cur.rowcount
        conn.commit()
    except Exception:
        logger.exception("[cleanup_old_pings] Failed to delete old ping history")
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                logger.exception("[cleanup_old_pings] Failed to rollback")
    finally:
        if conn is not None:
            conn.close()

    return {"deleted_rows": deleted_rows}
