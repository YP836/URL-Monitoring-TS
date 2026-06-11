from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from ..database import get_connection
from ..models import PingHistoryRead, URLCreate, URLDetail, URLRead


router = APIRouter()

_mock_urls: dict[int, URLRead] = {}
_mock_id_counter = 1


@router.get("/urls", response_model=list[URLRead])
async def list_urls() -> list[URLRead]:
    """Retrieve all monitored URLs."""
    try:
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
        return list(_mock_urls.values())


@router.post("/urls", response_model=URLRead, status_code=status.HTTP_201_CREATED)
async def create_url(payload: URLCreate) -> URLRead:
    """Add a new URL to monitor."""
    global _mock_id_counter

    web_address = str(payload.web_address)

    try:
        async with get_connection() as conn:
            existing = await conn.fetchval(
                "SELECT id FROM urls WHERE web_address = $1",
                web_address,
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This URL is already being monitored",
                )

            row = await conn.fetchrow(
                """
                INSERT INTO urls (web_address, name, status, created_at)
                VALUES ($1, $2, 'PENDING', NOW())
                RETURNING id, web_address, name, status, created_at
                """,
                web_address,
                payload.name,
            )
            return URLRead(**dict(row))
    except HTTPException:
        raise
    except Exception:
        for url in _mock_urls.values():
            if url.web_address == web_address:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This URL is already being monitored",
                )

        url_id = _mock_id_counter
        _mock_id_counter += 1

        new_url = URLRead(
            id=url_id,
            web_address=web_address,
            name=payload.name,
            status="PENDING",
            created_at=datetime.now(),
        )
        _mock_urls[url_id] = new_url
        return new_url


@router.get("/urls/{url_id}", response_model=URLDetail)
async def get_url_detail(url_id: int) -> URLDetail:
    """Retrieve details for a specific URL including recent pings."""
    try:
        async with get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT id, web_address, name, status, created_at FROM urls WHERE id = $1",
                url_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="URL not found")

            ping_rows = await conn.fetch(
                """
                SELECT id, url_id, checked_at, response_time_ms, status_code, is_up
                FROM ping_history
                WHERE url_id = $1
                ORDER BY checked_at DESC
                LIMIT 10
                """,
                url_id,
            )

            return URLDetail(
                **dict(row),
                recent_pings=[PingHistoryRead(**dict(ping)) for ping in ping_rows],
            )
    except HTTPException:
        raise
    except Exception:
        url = _mock_urls.get(url_id)
        if not url:
            raise HTTPException(status_code=404, detail="URL not found")

        return URLDetail(**url.model_dump(), recent_pings=[])


@router.delete("/urls/{url_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_url(url_id: int) -> None:
    """Delete a monitored URL."""
    try:
        async with get_connection() as conn:
            result = await conn.execute("DELETE FROM urls WHERE id = $1", url_id)
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="URL not found")
            return
    except HTTPException:
        raise
    except Exception:
        if url_id not in _mock_urls:
            raise HTTPException(status_code=404, detail="URL not found")
        del _mock_urls[url_id]
