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


def _write_check_results(results: list[CheckResult]) -> None:
    if not results:
        return
    url_id = results[0].url_id
    
    # Compute worst status
    overall_status = "UP"
    for r in results:
        if r.status == "DOWN":
            overall_status = "DOWN"
        elif r.status == "WARN" and overall_status != "DOWN":
            overall_status = "WARN"

    conn = None
    try:
        conn = _get_sync_conn()
        with conn.cursor() as cur:
            for result in results:
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
            
            cur.execute("SELECT status FROM urls WHERE id = %s", (url_id,))
            row = cur.fetchone()
            old_status = row[0] if row else "PENDING"

            cur.execute(
                "UPDATE urls SET status = %s, last_pinged_at = NOW() WHERE id = %s",
                (overall_status, url_id),
            )

            was_problem = old_status in ("DOWN", "WARN")
            is_problem = overall_status in ("DOWN", "WARN")

            # Captured so we can fire alerts AFTER the transaction commits.
            alert_event: tuple[str, int | None] | None = None

            if is_problem and not was_problem:
                cur.execute(
                    "SELECT id FROM url_incidents WHERE url_id = %s AND resolved_at IS NULL",
                    (url_id,),
                )
                if not cur.fetchone():
                    triggering_check = next(
                        (r.check_type for r in results if r.status == overall_status),
                        results[0].check_type,
                    )
                    cur.execute(
                        """INSERT INTO url_incidents (url_id, started_at, check_type, severity)
                           VALUES (%s, NOW(), %s, %s)
                           RETURNING id""",
                        (url_id, triggering_check, overall_status),
                    )
                    new_incident_id = cur.fetchone()[0]
                    alert_event = ("DOWN", new_incident_id)
            elif not is_problem and was_problem:
                cur.execute(
                    "UPDATE url_incidents SET resolved_at = NOW() WHERE url_id = %s AND resolved_at IS NULL",
                    (url_id,),
                )
                alert_event = ("UP", None)
        conn.commit()

        # Fire alerts only after a successful commit so we never notify on a
        # rolled-back write. A Redis/Celery outage must not break the ping path.
        if alert_event is not None:
            event_type, incident_id = alert_event
            try:
                dispatch_alerts.apply_async(
                    args=[url_id, event_type, incident_id], expires=120
                )
            except Exception:
                logger.exception("[ping_url] Failed to enqueue alert url_id=%s", url_id)
    except Exception:
        logger.exception("[ping_url] Failed to write ping results url_id=%s", url_id)
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
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


def _record_delivery(cur, channel_id, url_id, incident_id, event_type, status, error):
    cur.execute(
        """
        INSERT INTO alert_deliveries
            (channel_id, url_id, incident_id, event_type, status, error)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (channel_id, url_id, incident_id, event_type, status, error),
    )


@celery_app.task(name="app.worker.tasks.dispatch_alerts")
def dispatch_alerts(url_id: int, event_type: str, incident_id: int | None = None) -> dict:
    """Deliver an alert for a monitor transition to all matching enabled channels.

    event_type is one of DOWN | UP | TEST. Every attempt (success or failure) is
    logged to alert_deliveries so the UI can prove what was actually sent.
    """
    from app.worker.notifications import build_alert_message, send_email, send_webhook

    conn = None
    sent = 0
    failed = 0
    try:
        conn = _get_sync_conn()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name, web_address, user_id FROM urls WHERE id = %s",
                (url_id,),
            )
            url_row = cur.fetchone()
            if not url_row:
                return {"sent": 0, "failed": 0, "reason": "url_not_found"}
            url_name, web_address, user_id = url_row

            severity = None
            started_at = None
            duration_min = None
            if incident_id is not None:
                cur.execute(
                    "SELECT severity, started_at FROM url_incidents WHERE id = %s",
                    (incident_id,),
                )
                inc = cur.fetchone()
                if inc:
                    severity, started_at = inc

            cur.execute(
                """
                SELECT id, channel_type, destination
                FROM alert_channels
                WHERE user_id = %s
                  AND is_enabled = true
                  AND (
                        (%s = 'DOWN' AND notify_on_down)
                     OR (%s = 'UP'   AND notify_on_recovery)
                     OR (%s = 'TEST')
                  )
                """,
                (user_id, event_type, event_type, event_type),
            )
            channels = cur.fetchall()

            subject, text, html = build_alert_message(
                event_type, url_name, web_address, severity, started_at, duration_min
            )
            payload = {
                "event": event_type,
                "url_name": url_name,
                "url_address": web_address,
                "severity": severity,
                "timestamp": (started_at or datetime.utcnow()).isoformat(),
            }

            for channel_id, channel_type, destination in channels:
                try:
                    if channel_type == "EMAIL":
                        send_email(destination, subject, text, html)
                    elif channel_type == "WEBHOOK":
                        send_webhook(destination, text, payload)
                    else:
                        raise ValueError(f"Unknown channel type {channel_type}")
                    _record_delivery(
                        cur, channel_id, url_id, incident_id, event_type, "SENT", None
                    )
                    sent += 1
                except Exception as exc:
                    _record_delivery(
                        cur, channel_id, url_id, incident_id, event_type, "FAILED", str(exc)[:500]
                    )
                    failed += 1
                    logger.warning(
                        "[dispatch_alerts] channel=%s failed: %s", channel_id, exc
                    )
        conn.commit()
    except Exception:
        logger.exception("[dispatch_alerts] url_id=%s event=%s failed", url_id, event_type)
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
    finally:
        if conn is not None:
            conn.close()
    return {"sent": sent, "failed": failed}


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
        results = []
        for ct in _split_check_types(check_type):
            results.append(_run_check(url_id, web_address, ct, keyword))
    except Exception as exc:
        raise self.retry(exc=exc)

    _write_check_results(results)
    
    payloads = []
    for result in results:
        payload = {
            "url_id": result.url_id,
            "status": result.status,
            "latency_ms": result.latency_ms,
            "check_type": result.check_type,
            "extra_data": result.extra_data,
            "checked_at": result.checked_at,
        }
        _publish_ping_result(payload)
        payloads.append(payload)

        logger.info(
            "[ping_url] url_id=%s check_type=%s status=%s latency=%sms",
            result.url_id,
            result.check_type,
            result.status,
            result.latency_ms,
        )
    return {"results": payloads}


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
        ping_url.apply_async(
            args=[url_id, web_address, check_type, keyword], 
            expires=25,
        )
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
