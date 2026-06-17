import json
import logging
from datetime import datetime
from typing import Any

import redis
from psycopg2.extras import Json

from app.config import settings
from app.worker.celery_app import celery_app
from app.worker.checks import (
    CheckResult,
    run_downtime_duration_check,
    run_error_rate_check,
    run_http_check,
    run_keyword_check,
    run_ssl_check,
    run_ttfb_check,
)


logger = logging.getLogger(__name__)


KNOWN_CHECK_TYPES = {"HTTP", "SSL_EXPIRY", "TTFB", "KEYWORD", "DOWNTIME_DURATION", "ERROR_RATE"}


def _get_sync_conn():
    import psycopg2

    return psycopg2.connect(settings.database_url)


def _status_to_is_up(status: str) -> bool:
    return status in {"UP", "WARN"}


def _write_check_result(result: CheckResult) -> None:
    conn = None
    try:
        conn = _get_sync_conn()
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    INSERT INTO ping_history
                        (url_id, checked_at, response_time_ms, status_code, is_up, check_type, extra_data)
                    VALUES (%s, NOW(), %s, %s, %s, %s, %s)
                    """,
                    (
                        result.url_id,
                        result.latency_ms,
                        result.extra_data.get("status_code"),
                        _status_to_is_up(result.status),
                        result.check_type,
                        Json(result.extra_data),
                    ),
                )
            except Exception:
                conn.rollback()
                cur.execute(
                    """
                    INSERT INTO ping_history
                        (url_id, checked_at, response_time_ms, status_code, is_up)
                    VALUES (%s, NOW(), %s, %s, %s)
                    """,
                    (
                        result.url_id,
                        result.latency_ms,
                        result.extra_data.get("status_code"),
                        _status_to_is_up(result.status),
                    ),
                )
            cur.execute(
                "UPDATE urls SET status = %s, last_pinged_at = NOW() WHERE id = %s",
                (result.status, result.url_id),
            )
        conn.commit()
    except Exception:
        logger.exception("[ping_url] Failed to write ping result url_id=%s", result.url_id)
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                logger.exception("[ping_url] Failed to rollback url_id=%s", result.url_id)
    finally:
        if conn is not None:
            conn.close()


def _run_check(
    url_id: int,
    web_address: str,
    check_type: str,
    keyword: str | None,
) -> CheckResult:
    normalized_check_type = check_type or "HTTP"

    if normalized_check_type == "HTTP":
        return run_http_check(url_id, web_address)
    if normalized_check_type == "SSL_EXPIRY":
        return run_ssl_check(url_id, web_address)
    if normalized_check_type == "TTFB":
        return run_ttfb_check(url_id, web_address)
    if normalized_check_type == "KEYWORD":
        return run_keyword_check(url_id, web_address, keyword or "")
    if normalized_check_type in {"DOWNTIME_DURATION", "ERROR_RATE"}:
        conn = None
        try:
            conn = _get_sync_conn()
            if normalized_check_type == "DOWNTIME_DURATION":
                return run_downtime_duration_check(url_id, conn)
            return run_error_rate_check(url_id, conn)
        finally:
            if conn is not None:
                conn.close()

    logger.warning("[ping_url] Unknown check_type=%s, falling back to HTTP", normalized_check_type)
    return run_http_check(url_id, web_address)


def _split_check_types(value: str | None) -> list[str]:
    checks = [item.strip().upper() for item in (value or "HTTP").split(",") if item.strip()]
    return [check for check in checks if check in KNOWN_CHECK_TYPES] or ["HTTP"]


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
def ping_url(
    self,
    url_id: int,
    web_address: str,
    check_type: str = "HTTP",
    keyword: str | None = None,
) -> dict:
    try:
        result = _run_check(url_id, web_address, check_type, keyword)
    except Exception as exc:
        raise self.retry(exc=exc)

    payload = {
        "url_id": result.url_id,
        "status": result.status,
        "latency_ms": result.latency_ms,
        "check_type": result.check_type,
        "extra_data": result.extra_data,
        "checked_at": result.checked_at,
    }

    _write_check_result(result)
    _publish_ping_result(payload)

    logger.info(
        "[ping_url] url_id=%s check_type=%s status=%s latency=%sms",
        result.url_id,
        result.check_type,
        result.status,
        result.latency_ms,
    )
    return payload


@celery_app.task(name="app.worker.tasks.schedule_ping_tasks")
def schedule_ping_tasks() -> dict:
    conn = None
    try:
        conn = _get_sync_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, web_address, check_type, keyword_to_find
                FROM urls
                WHERE last_pinged_at IS NULL
                   OR EXTRACT(EPOCH FROM (NOW() - last_pinged_at)) >=
                      COALESCE(ping_interval_seconds, check_interval_seconds, 30)
                """
            )
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
        check_type = row["check_type"] if isinstance(row, dict) else row[2]
        keyword = row["keyword_to_find"] if isinstance(row, dict) else row[3]
        for selected_check_type in _split_check_types(check_type):
            ping_url.apply_async(args=[url_id, web_address, selected_check_type, keyword], expires=25)
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
