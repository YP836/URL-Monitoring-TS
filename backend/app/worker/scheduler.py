"""Due-monitor selection and atomic claiming for the Celery beat scheduler.

The scheduler must never hand the same monitor to two workers, and must not
re-enqueue a monitor that is already in flight. Both are achieved with a single
atomic SQL statement instead of an external lock service:

  - We select due rows (next_check_at <= NOW()) with FOR UPDATE SKIP LOCKED and,
    in the same transaction, push their next_check_at one interval into the
    future. Once claimed, a monitor's next_check_at is in the future, so the
    next beat tick (5s later) will not select it again until a full interval has
    elapsed -- even if its probe is still running. This is what prevents the
    duplicate-check problem the old "EXTRACT(EPOCH ...) >= interval" query had.

  - SKIP LOCKED lets any number of concurrent schedulers/workers claim disjoint
    batches without blocking each other, so this is safe to scale horizontally.

If a worker crashes after claiming but before probing, no state is corrupted:
the monitor is simply checked again at its next interval.
"""
from datetime import datetime, timedelta
from typing import Any

DEFAULT_INTERVAL_SECONDS = 30
# Cap per-tick batch size so a backlog can't create one enormous transaction.
# At 1k monitors / 60s cadence a tick claims ~17 rows; 500 leaves wide headroom.
CLAIM_BATCH_SIZE = 500

_CLAIM_SQL = """
WITH due AS (
    SELECT id
    FROM urls
    WHERE next_check_at IS NULL OR next_check_at <= NOW()
    ORDER BY next_check_at NULLS FIRST
    FOR UPDATE SKIP LOCKED
    LIMIT %s
)
UPDATE urls u
SET next_check_at = NOW()
    + (COALESCE(u.ping_interval_seconds, u.check_interval_seconds, %s) || ' seconds')::interval
FROM due
WHERE u.id = due.id
RETURNING u.id, u.web_address, u.check_type, u.keyword_to_find;
"""


def compute_next_check_at(now: datetime, interval_seconds: int | None) -> datetime:
    """Next due time after a claim. Pure function, unit-testable."""
    seconds = interval_seconds if interval_seconds and interval_seconds > 0 else DEFAULT_INTERVAL_SECONDS
    return now + timedelta(seconds=seconds)


def claim_due_monitors(conn, limit: int = CLAIM_BATCH_SIZE) -> list[dict[str, Any]]:
    """Atomically claim due monitors and advance their next_check_at.

    Returns a list of {id, web_address, check_type, keyword_to_find}. Commits so
    the rows are released immediately for other transactions.
    """
    with conn.cursor() as cur:
        cur.execute(_CLAIM_SQL, (limit, DEFAULT_INTERVAL_SECONDS))
        rows = cur.fetchall()
    conn.commit()
    return [
        {
            "id": row[0],
            "web_address": row[1],
            "check_type": row[2],
            "keyword_to_find": row[3],
        }
        for row in rows
    ]
