import asyncio
import logging

from fastapi import WebSocket


logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock: asyncio.Lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)
            total = len(self._connections)
        logger.info("[ws] client connected, total=%s", total)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)
            total = len(self._connections)
        logger.info("[ws] client disconnected, total=%s", total)

    async def broadcast(self, message: str) -> None:
        async with self._lock:
            connections = set(self._connections)

        for websocket in connections:
            try:
                await websocket.send_text(message)
            except Exception:
                await self.disconnect(websocket)

        logger.debug("[ws] broadcast to %s clients: %s", len(connections), message[:80])

    @property
    def active_count(self) -> int:
        return len(self._connections)


manager = ConnectionManager()
