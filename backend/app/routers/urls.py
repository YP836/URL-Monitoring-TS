import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status

from ..database import get_connection
from ..models import PingHistoryRead, URLCreate, URLDetail, URLExtraData, URLRead


router = APIRouter()

_mock_urls: dict[int, URLRead] = {}
_mock_id_counter = 1


def _normalize_extra_data(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _split_check_types(value: str | None) -> list[str]:
    checks = [item.strip().upper() for item in (value or "HTTP").split(",") if item.strip()]
    return checks or ["HTTP"]


@router.get("/urls", response_model=list[URLRead])
async def list_urls() -> list[URLRead]:
    """Retrieve all monitored URLs."""
    try:
        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT id, web_address, name, status, created_at, check_type, keyword_to_find
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
                INSERT INTO urls
                    (web_address, name, status, created_at, check_type, keyword_to_find, check_interval_seconds)
                VALUES ($1, $2, 'PENDING', NOW(), $3, $4, $5)
                RETURNING id, web_address, name, status, created_at, check_type, keyword_to_find
                """,
                web_address,
                payload.name,
                payload.check_type,
                payload.keyword_to_find,
                payload.check_interval_seconds,
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
            check_type=payload.check_type,
            keyword_to_find=payload.keyword_to_find,
        )
        _mock_urls[url_id] = new_url
        return new_url


@router.get("/urls/{url_id}", response_model=URLDetail)
async def get_url_detail(url_id: int) -> URLDetail:
    """Retrieve details for a specific URL including recent pings."""
    try:
        async with get_connection() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, web_address, name, status, created_at, check_type, keyword_to_find
                FROM urls
                WHERE id = $1
                """,
                url_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="URL not found")

            ping_rows = await conn.fetch(
                """
                SELECT id, url_id, checked_at, response_time_ms, status_code, is_up, check_type, extra_data
                FROM ping_history
                WHERE url_id = $1
                ORDER BY checked_at DESC
                LIMIT 10
                """,
                url_id,
            )

            return URLDetail(
                **dict(row),
                recent_pings=[
                    PingHistoryRead(
                        **{
                            **dict(ping),
                            "extra_data": _normalize_extra_data(dict(ping).get("extra_data")),
                        }
                    )
                    for ping in ping_rows
                ],
            )
    except HTTPException:
        raise
    except Exception:
        url = _mock_urls.get(url_id)
        if not url:
            raise HTTPException(status_code=404, detail="URL not found")

        return URLDetail(**url.model_dump(), recent_pings=[])


@router.get("/urls/{url_id}/extra", response_model=URLExtraData)
async def get_url_extra_data(url_id: int) -> URLExtraData:
    """Retrieve the most recent extra_data payload for each selected URL check."""
    try:
        async with get_connection() as conn:
            url_row = await conn.fetchrow("SELECT check_type FROM urls WHERE id = $1", url_id)
            if not url_row:
                raise HTTPException(status_code=404, detail="URL not found")

            selected_checks = _split_check_types(url_row["check_type"])
            rows = await conn.fetch(
                """
                SELECT DISTINCT ON (check_type) check_type, extra_data, checked_at
                FROM ping_history
                WHERE url_id = $1 AND extra_data IS NOT NULL AND check_type = ANY($2::text[])
                ORDER BY check_type, checked_at DESC
                """,
                url_id,
                selected_checks,
            )
            if not rows:
                raise HTTPException(status_code=404, detail="No extra data found")

            extra_by_check: dict[str, Any] = {}
            latest_checked_at = None
            for row in rows:
                row_data = dict(row)
                check_type = row_data["check_type"]
                extra_by_check[check_type] = _normalize_extra_data(row_data.get("extra_data")) or {}
                checked_at = row_data["checked_at"]
                if latest_checked_at is None or checked_at > latest_checked_at:
                    latest_checked_at = checked_at

            return URLExtraData(
                check_type=url_row["check_type"],
                extra_data=extra_by_check,
                checked_at=latest_checked_at,
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="No extra data found")


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
