from contextlib import asynccontextmanager
from typing import AsyncIterator

import asyncpg

from .config import settings


_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Lazily create and return the asyncpg pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(dsn=settings.database_url)
    return _pool


@asynccontextmanager
async def get_connection() -> AsyncIterator[asyncpg.Connection]:
    """Acquire a connection from the pool as an async context manager."""
    pool = await get_pool()
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)


async def close_pool() -> None:
    """Close the pool if it exists."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
