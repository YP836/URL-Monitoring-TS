import asyncio
import logging

import redis.asyncio as aioredis

from app.config import settings
from app.websocket_manager import ConnectionManager


logger = logging.getLogger(__name__)


async def redis_listener(manager: ConnectionManager) -> None:
    """Relay worker-published events from Redis Pub/Sub to WebSocket clients.

    Design note (Phase 3): the worker publishes to `ping_results` ONLY on
    meaningful events — a monitor status change (UP/DOWN/WARN), an incident
    open/resolve, or a user-triggered manual check — not on every steady-state
    ping. This keeps fan-out proportional to events, not to fleet size × check
    rate (at 1k monitors that would be ~200 msg/s of mostly "still UP" noise).

    Redis Pub/Sub is fire-and-forget: a client that is briefly disconnected
    misses messages, and there is no replay. So the WebSocket stream is a
    *latency optimization*, not the source of truth — the frontend also polls
    on an interval to resync. Durable delivery (Redis Streams / a real broker)
    is the next step when missed events become unacceptable.
    """
    while True:
        client = None
        pubsub = None
        try:
            client = aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            pubsub = client.pubsub()
            await pubsub.subscribe("ping_results")
            logger.info("[redis_listener] subscribed to ping_results")

            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                await manager.broadcast(message["data"])
        except asyncio.CancelledError:
            logger.info("[redis_listener] shutting down")
            if pubsub is not None:
                try:
                    await pubsub.unsubscribe("ping_results")
                    await pubsub.aclose()
                except Exception:
                    logger.debug("[redis_listener] pubsub cleanup skipped", exc_info=True)
            if client is not None:
                try:
                    await client.aclose()
                except Exception:
                    logger.debug("[redis_listener] client cleanup skipped", exc_info=True)
            raise
        except Exception as exc:
            logger.error(
                "[redis_listener] Redis error: %s, reconnecting in 5s",
                exc,
            )
            if pubsub is not None:
                try:
                    await pubsub.unsubscribe("ping_results")
                    await pubsub.aclose()
                except Exception:
                    logger.debug("[redis_listener] pubsub cleanup skipped", exc_info=True)
            if client is not None:
                try:
                    await client.aclose()
                except Exception:
                    logger.debug("[redis_listener] client cleanup skipped", exc_info=True)
            await asyncio.sleep(5)
