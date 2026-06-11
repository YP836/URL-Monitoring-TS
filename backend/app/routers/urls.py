from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional

from ..models import URLCreate, URLRead, PingHistoryRead
from ..database import get_connection

router = APIRouter()

# In-memory storage for Phase 2 development (will use real DB in Phase 3)
_mock_urls: dict = {}
_mock_id_counter = 1


@router.get("/urls")
async def list_urls() -> list[URLRead]:
    """Retrieve all monitored URLs."""
    try:
        # Try to fetch from database
        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT id, web_address, name, status, created_at
                FROM urls
                ORDER BY created_at DESC
                """
            )
            return [URLRead(**dict(row)) for row in rows]
    except Exception:
        # Fallback to mock data for development
        return list(_mock_urls.values())


@router.post("/urls", status_code=status.HTTP_201_CREATED)
async def add_url(payload: URLCreate) -> URLRead:
    """Add a new URL to monitor."""
    global _mock_id_counter

    web_address_str = str(payload.web_address)

    try:
        # Try to use database
        async with get_connection() as conn:
            # Check if URL already exists
            existing = await conn.fetchval(
                "SELECT id FROM urls WHERE web_address = $1",
                web_address_str
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This URL is already being monitored"
                )

            # Insert new URL
            url_id = await conn.fetchval(
                """
                INSERT INTO urls (web_address, name, status, created_at)
                VALUES ($1, $2, 'PENDING', NOW())
                RETURNING id
                """,
                web_address_str,
                payload.name
            )

            # Fetch and return the new URL
            row = await conn.fetchrow(
                "SELECT id, web_address, name, status, created_at FROM urls WHERE id = $1",
                url_id
            )
            return URLRead(**dict(row))
    except HTTPException:
        raise
    except Exception:
        # Fallback to mock data for development
        # Check if URL already exists in mock
        for url in _mock_urls.values():
            if url.web_address == web_address_str:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This URL is already being monitored"
                )

        # Create new mock URL
        url_id = _mock_id_counter
        _mock_id_counter += 1

        new_url = URLRead(
            id=url_id,
            web_address=web_address_str,
            name=payload.name,
            status="PENDING",
            created_at=datetime.now().isoformat()
        )
        _mock_urls[url_id] = new_url
        return new_url


@router.get("/urls/{url_id}")
async def get_url_detail(url_id: int):
    """Retrieve details for a specific URL including recent pings."""
    try:
        # Try to use database
        async with get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT id, web_address, name, status, created_at FROM urls WHERE id = $1",
                url_id
            )
            if not row:
                raise HTTPException(status_code=404, detail="URL not found")

            url_detail = URLRead(**dict(row))

            # Get recent pings
            ping_rows = await conn.fetch(
                """
                SELECT id, url_id, checked_at, response_time_ms, status_code, is_up
                FROM ping_history
                WHERE url_id = $1
                ORDER BY checked_at DESC
                LIMIT 10
                """,
                url_id
            )

            recent_pings = [PingHistoryRead(**dict(row)) for row in ping_rows]
            return {**url_detail.dict(), "recent_pings": recent_pings}
    except HTTPException:
        raise
    except Exception:
        # Fallback to mock data
        url = _mock_urls.get(url_id)
        if not url:
            raise HTTPException(status_code=404, detail="URL not found")

        return {**url.dict(), "recent_pings": []}


@router.delete("/urls/{url_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_url(url_id: int):
    """Delete a monitored URL."""
    try:
        # Try to use database
        async with get_connection() as conn:
            result = await conn.execute(
                "DELETE FROM urls WHERE id = $1",
                url_id
            )
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="URL not found")
    except HTTPException:
        raise
    except Exception:
        # Fallback to mock data
        if url_id not in _mock_urls:
            raise HTTPException(status_code=404, detail="URL not found")
        del _mock_urls[url_id]
