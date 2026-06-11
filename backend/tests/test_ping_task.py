import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch

import httpx


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("API_KEY", "test-api-key")

from app.worker.celery_app import celery_app
from app.worker.tasks import ping_url, schedule_ping_tasks


celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = True


def _mock_connection(rows=None):
    conn = Mock()
    cursor = Mock()
    cursor.__enter__ = Mock(return_value=cursor)
    cursor.__exit__ = Mock(return_value=None)
    cursor.fetchall.return_value = rows or []
    conn.cursor.return_value = cursor
    return conn


@patch("app.worker.tasks.redis.from_url")
@patch("app.worker.tasks._get_sync_conn")
@patch("app.worker.tasks.httpx.Client.get")
def test_ping_url_success(mock_get, mock_get_sync_conn, mock_redis_from_url):
    response = Mock()
    response.status_code = 200
    mock_get.return_value = response
    mock_get_sync_conn.return_value = _mock_connection()
    mock_redis_from_url.return_value = Mock()

    result = ping_url.apply(args=[1, "https://example.com"]).get()

    assert result["status"] == "UP"
    assert result["latency_ms"] is not None


@patch("app.worker.tasks.redis.from_url")
@patch("app.worker.tasks._get_sync_conn")
@patch("app.worker.tasks.httpx.Client.get")
def test_ping_url_timeout(mock_get, mock_get_sync_conn, mock_redis_from_url):
    mock_get.side_effect = httpx.TimeoutException("request timed out")
    mock_get_sync_conn.return_value = _mock_connection()
    mock_redis_from_url.return_value = Mock()

    result = ping_url.apply(args=[1, "https://example.com"]).get()

    assert result["status"] == "DOWN"
    assert result["latency_ms"] is None


@patch("app.worker.tasks.redis.from_url")
@patch("app.worker.tasks._get_sync_conn")
@patch("app.worker.tasks.httpx.Client.get")
def test_ping_url_4xx_is_down(mock_get, mock_get_sync_conn, mock_redis_from_url):
    response = Mock()
    response.status_code = 404
    mock_get.return_value = response
    mock_get_sync_conn.return_value = _mock_connection()
    mock_redis_from_url.return_value = Mock()

    result = ping_url.apply(args=[1, "https://example.com"]).get()

    assert result["status"] == "DOWN"


@patch("app.worker.tasks.ping_url.apply_async")
@patch("app.worker.tasks._get_sync_conn")
def test_schedule_ping_tasks_enqueues_correctly(mock_get_sync_conn, mock_apply_async):
    rows = [
        {"id": 1, "web_address": "https://a.com"},
        {"id": 2, "web_address": "https://b.com"},
    ]
    mock_get_sync_conn.return_value = _mock_connection(rows=rows)

    result = schedule_ping_tasks.apply().get()

    assert mock_apply_async.call_count == 2
    assert result["enqueued"] == 2
