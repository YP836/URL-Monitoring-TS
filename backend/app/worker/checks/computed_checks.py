from datetime import datetime, timedelta, timezone
from typing import Iterable

from .base import CheckResult


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _row_value(row, key: str, index: int):
    if isinstance(row, dict):
        return row[key]
    return row[index]


def _normalize_dt(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _downtime_minutes(rows: Iterable, window_start: datetime, now: datetime) -> int:
    active_down_start: datetime | None = None
    total_seconds = 0.0

    for row in rows:
        checked_at = _normalize_dt(_row_value(row, "checked_at", 0))
        is_up = bool(_row_value(row, "is_up", 1))

        if is_up:
            if active_down_start is not None:
                total_seconds += max(0.0, (checked_at - max(active_down_start, window_start)).total_seconds())
                active_down_start = None
            continue

        if active_down_start is None:
            active_down_start = checked_at

    if active_down_start is not None:
        total_seconds += max(0.0, (now - max(active_down_start, window_start)).total_seconds())

    return int(total_seconds // 60)


def _incident_count_30d(rows: Iterable) -> int:
    count = 0
    was_down = False
    for row in rows:
        is_up = bool(_row_value(row, "is_up", 1))
        if not is_up and not was_down:
            count += 1
        was_down = not is_up
    return count


def run_downtime_duration_check(url_id: int, conn) -> CheckResult:
    now = _utc_now()
    thirty_days_ago = now - timedelta(days=30)

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT checked_at, is_up
            FROM ping_history
            WHERE url_id = %s
              AND checked_at >= %s
              AND (check_type = 'HTTP' OR check_type IS NULL)
            ORDER BY checked_at ASC
            """,
            (url_id, thirty_days_ago),
        )
        rows = cur.fetchall()

    downtime_24h = _downtime_minutes(rows, now - timedelta(hours=24), now)
    downtime_7d = _downtime_minutes(rows, now - timedelta(days=7), now)
    downtime_30d = _downtime_minutes(rows, thirty_days_ago, now)
    incident_count_30d = _incident_count_30d(rows)

    if downtime_30d == 0:
        status = "UP"
    elif downtime_30d < 60:
        status = "WARN"
    else:
        status = "DOWN"

    return CheckResult(
        url_id=url_id,
        check_type="DOWNTIME_DURATION",
        status=status,
        latency_ms=None,
        extra_data={
            "downtime_minutes_24h": downtime_24h,
            "downtime_minutes_7d": downtime_7d,
            "downtime_minutes_30d": downtime_30d,
            "incident_count_30d": incident_count_30d,
        },
        checked_at=_utc_timestamp(),
    )


def run_error_rate_check(url_id: int, conn) -> CheckResult:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT is_up
            FROM ping_history
            WHERE url_id = %s
              AND (check_type = 'HTTP' OR check_type IS NULL)
            ORDER BY checked_at DESC
            LIMIT 100
            """,
            (url_id,),
        )
        rows = cur.fetchall()

    total_pings = len(rows)
    error_pings = sum(1 for row in rows if not bool(_row_value(row, "is_up", 0)))
    error_rate_pct = (error_pings / total_pings) * 100 if total_pings else 0.0

    if error_rate_pct < 1:
        status = "UP"
    elif error_rate_pct < 10:
        status = "WARN"
    else:
        status = "DOWN"

    return CheckResult(
        url_id=url_id,
        check_type="ERROR_RATE",
        status=status,
        latency_ms=None,
        extra_data={
            "total_pings": total_pings,
            "error_pings": error_pings,
            "error_rate_pct": error_rate_pct,
        },
        checked_at=_utc_timestamp(),
    )
