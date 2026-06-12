import json
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("API_KEY", "test-api-key")

from app.config import settings
from app.main import app


def test_ws_connects_and_receives_welcome():
    with TestClient(app) as client:
        with client.websocket_connect("/ws") as ws:
            data = json.loads(ws.receive_text())

            assert data["type"] == "connected"
            assert "active_connections" in data


def test_ws_ping_pong():
    with TestClient(app) as client:
        with client.websocket_connect("/ws") as ws:
            json.loads(ws.receive_text())
            ws.send_text("ping")

            response = ws.receive_text()

            assert response == "pong"


def test_ws_stats_endpoint():
    with TestClient(app) as client:
        response = client.get("/ws/stats", headers={"X-API-Key": settings.api_key})

        assert response.status_code == 200
        data = response.json()
        assert data["redis_channel"] == "ping_results"
        assert "active_connections" in data
