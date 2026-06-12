import asyncio
import json

from fastapi import APIRouter, Depends, Header, HTTPException, WebSocket, WebSocketDisconnect, status

from app.config import settings
from app.websocket_manager import manager


router = APIRouter(tags=["websocket"])


def verify_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    if not x_api_key or x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        await websocket.send_text(
            json.dumps(
                {
                    "type": "connected",
                    "message": "Connected to uptime monitor",
                    "active_connections": manager.active_count,
                }
            )
        )

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                try:
                    await websocket.send_text(json.dumps({"type": "heartbeat"}))
                except Exception:
                    break
            except WebSocketDisconnect:
                break
            except Exception:
                break
    finally:
        await manager.disconnect(websocket)


@router.get("/ws/stats", dependencies=[Depends(verify_api_key)])
async def websocket_stats() -> dict:
    return {
        "active_connections": manager.active_count,
        "redis_channel": "ping_results",
        "status": "ok",
    }
