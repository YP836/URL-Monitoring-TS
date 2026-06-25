import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("API_KEY", "test-api-key")

from app.worker.scheduler import (
    DEFAULT_INTERVAL_SECONDS,
    claim_due_monitors,
    compute_next_check_at,
)


def test_compute_next_check_at_uses_interval():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert (compute_next_check_at(now, 60) - now).total_seconds() == 60


def test_compute_next_check_at_falls_back_to_default():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert (compute_next_check_at(now, None) - now).total_seconds() == DEFAULT_INTERVAL_SECONDS
    assert (compute_next_check_at(now, 0) - now).total_seconds() == DEFAULT_INTERVAL_SECONDS
    assert (compute_next_check_at(now, -5) - now).total_seconds() == DEFAULT_INTERVAL_SECONDS


def _mock_conn(rows):
    cursor = Mock()
    cursor.__enter__ = Mock(return_value=cursor)
    cursor.__exit__ = Mock(return_value=None)
    cursor.fetchall.return_value = rows
    conn = Mock()
    conn.cursor.return_value = cursor
    return conn, cursor


def test_claim_due_monitors_maps_rows_and_commits():
    rows = [
        (1, "https://a.com", "HTTP", None),
        (2, "https://b.com", "KEYWORD", "checkout"),
    ]
    conn, cursor = _mock_conn(rows)

    claimed = claim_due_monitors(conn, limit=100)

    assert claimed == [
        {"id": 1, "web_address": "https://a.com", "check_type": "HTTP", "keyword_to_find": None},
        {"id": 2, "web_address": "https://b.com", "check_type": "KEYWORD", "keyword_to_find": "checkout"},
    ]
    # The claim must be committed so the advanced next_check_at is released.
    conn.commit.assert_called_once()
    # Limit is passed through to the SQL so batch size is bounded.
    assert cursor.execute.call_args[0][1][0] == 100


def test_claim_due_monitors_empty():
    conn, _ = _mock_conn([])
    assert claim_due_monitors(conn) == []
