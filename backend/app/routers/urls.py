import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from starlette.concurrency import run_in_threadpool
from typing import Annotated
from ..auth import get_current_user, require_admin
from ..models import UserRead

from ..database import get_connection
from ..models import PingHistoryRead, URLCreate, URLDetail, URLExtraData, URLRead, URLUpdate
from ..worker.tasks import ping_url


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


def _run_check_now_sync(url_id: int, web_address: str, check_type: str, keyword: str | None) -> dict[str, Any]:
    return ping_url.apply(args=[url_id, web_address, check_type, keyword]).get()


def _enqueue_selected_checks(
    url_id: int, web_address: str, check_type: str, keyword: str | None, manual: bool = False
) -> None:
    for index, selected_check in enumerate(_split_check_types(check_type)):
        try:
            ping_url.apply_async(
                args=[url_id, web_address, selected_check, keyword, manual],
                expires=25,
                countdown=index * 2,
            )
        except Exception:
            # If Redis/Celery is offline, the manual Check now endpoint still works synchronously.
            continue


async def _fetch_visible_url(conn: Any, url_id: int, current_user: UserRead) -> Any:
    if current_user.role == "admin":
        return await conn.fetchrow(
            """
            SELECT
                urls.id, urls.web_address, urls.name, urls.status, urls.created_at, urls.check_type,
                urls.keyword_to_find, urls.check_interval_seconds, urls.ping_interval_seconds,
                users.email as owner_email, urls.is_public
            FROM urls
            LEFT JOIN users ON urls.user_id = users.id
            WHERE urls.id = $1
            """,
            url_id,
        )

    return await conn.fetchrow(
        """
        SELECT
            id, web_address, name, status, created_at, check_type, keyword_to_find,
            check_interval_seconds, ping_interval_seconds, is_public
        FROM urls
        WHERE id = $1 AND user_id = $2
        """,
        url_id,
        current_user.id,
    )


@router.get("/urls", response_model=list[URLRead])
async def list_urls(current_user: Annotated[UserRead, Depends(get_current_user)]) -> list[URLRead]:
    """Retrieve all monitored URLs."""
    try:
        async with get_connection() as conn:
            if current_user.role == "admin":
                rows = await conn.fetch(
                    """
                    SELECT
                        urls.id, urls.web_address, urls.name, urls.status, urls.created_at, urls.check_type, urls.keyword_to_find,
                        urls.check_interval_seconds, urls.ping_interval_seconds, users.email as owner_email, urls.is_public
                    FROM urls
                    LEFT JOIN users ON urls.user_id = users.id
                    ORDER BY urls.created_at DESC
                    """
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT
                        id, web_address, name, status, created_at, check_type, keyword_to_find,
                        check_interval_seconds, ping_interval_seconds, is_public
                    FROM urls WHERE user_id = $1
                    ORDER BY created_at DESC
                    """, current_user.id
                )
            return [URLRead(**dict(row)) for row in rows]
    except Exception:
        return list(_mock_urls.values())


@router.post("/urls", response_model=URLRead, status_code=status.HTTP_201_CREATED)
async def create_url(payload: URLCreate, current_user: Annotated[UserRead, Depends(get_current_user)]) -> URLRead:
    """Add a new URL to monitor."""
    global _mock_id_counter

    web_address = str(payload.web_address)

    try:
        async with get_connection() as conn:
            existing = await conn.fetchval(
                "SELECT id FROM urls WHERE web_address = $1 AND user_id = $2",
                web_address, current_user.id
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This URL is already being monitored",
                )

            row = await conn.fetchrow(
                """
                INSERT INTO urls
                    (
                        user_id, web_address, name, status, created_at, check_type, keyword_to_find,
                        check_interval_seconds, ping_interval_seconds
                    )
                VALUES ($1, $2, $3, 'PENDING', NOW(), $4, $5, $6, $7)
                RETURNING
                    id, web_address, name, status, created_at, check_type, keyword_to_find,
                    check_interval_seconds, ping_interval_seconds, is_public
                """,
                current_user.id,
                web_address,
                payload.name,
                payload.check_type,
                payload.keyword_to_find,
                payload.check_interval_seconds,
                payload.ping_interval_seconds,
            )
            created_url = URLRead(**dict(row))
            _enqueue_selected_checks(
                created_url.id,
                created_url.web_address,
                created_url.check_type,
                created_url.keyword_to_find,
            )
            return created_url
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
            check_interval_seconds=payload.check_interval_seconds,
            ping_interval_seconds=payload.ping_interval_seconds,
        )
        _mock_urls[url_id] = new_url
        return new_url


@router.get("/urls/{url_id}", response_model=URLDetail)
async def get_url_detail(url_id: int, current_user: Annotated[UserRead, Depends(get_current_user)]) -> URLDetail:
    """Retrieve details for a specific URL including recent pings."""
    try:
        async with get_connection() as conn:
            row = await _fetch_visible_url(conn, url_id, current_user)
            if not row:
                raise HTTPException(status_code=404, detail="URL not found")

            ping_rows = await conn.fetch(
                """
                SELECT id, url_id, checked_at, response_time_ms, status_code, is_up, check_type, extra_data
                FROM ping_history
                WHERE url_id = $1
                ORDER BY checked_at DESC
                LIMIT 3000
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
async def get_url_extra_data(url_id: int, current_user: Annotated[UserRead, Depends(get_current_user)]) -> URLExtraData:
    """Retrieve the most recent extra_data payload for each selected URL check."""
    try:
        async with get_connection() as conn:
            url_row = await _fetch_visible_url(conn, url_id, current_user)
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


@router.post("/urls/{url_id}/check", status_code=status.HTTP_202_ACCEPTED)
async def check_url_now(url_id: int, current_user: Annotated[UserRead, Depends(get_current_user)]) -> dict[str, Any]:
    """Queue an immediate re-check. Returns 202 right away; the worker runs the
    checks in the background and pushes the outcome over WebSocket (poll is the
    durable fallback). This keeps the API request from blocking on slow probes."""
    async with get_connection() as conn:
        row = await _fetch_visible_url(conn, url_id, current_user)
        if not row:
            raise HTTPException(status_code=404, detail="URL not found")

    selected_checks = _split_check_types(row["check_type"])
    # Fire-and-forget onto Celery; never block the request on the probe itself.
    # manual=True so the worker pushes the result over WebSocket even if the
    # status did not change (the user asked for it and is watching).
    await run_in_threadpool(
        _enqueue_selected_checks,
        row["id"],
        row["web_address"],
        row["check_type"],
        row["keyword_to_find"],
        True,
    )

    return {
        "url_id": url_id,
        "status": "queued",
        "checks_enqueued": len(selected_checks),
    }


@router.put("/urls/{url_id}", response_model=URLRead)
async def update_url(url_id: int, payload: URLUpdate, current_user: Annotated[UserRead, Depends(get_current_user)]) -> URLRead:
    """Update mutable URL fields without changing its selected monitoring signals."""
    try:
        async with get_connection() as conn:
            if current_user.role == "admin":
                existing = await conn.fetchrow("SELECT * FROM urls WHERE id = $1", url_id)
            else:
                existing = await conn.fetchrow("SELECT * FROM urls WHERE id = $1 AND user_id = $2", url_id, current_user.id)
            
            if not existing:
                raise HTTPException(status_code=404, detail="URL not found")

            new_web_address = str(payload.web_address) if payload.web_address else existing["web_address"]
            new_name = payload.name if payload.name else existing["name"]
            new_interval = (
                payload.ping_interval_seconds
                if payload.ping_interval_seconds is not None
                else existing["ping_interval_seconds"]
            )

            new_is_public = payload.is_public if payload.is_public is not None else existing.get("is_public", False)

            row = await conn.fetchrow(
                """
                UPDATE urls
                SET web_address = $1, name = $2, ping_interval_seconds = $3, check_interval_seconds = $3, is_public = $5
                WHERE id = $4
                RETURNING
                    id, web_address, name, status, created_at, check_type, keyword_to_find,
                    check_interval_seconds, ping_interval_seconds, is_public
                """,
                new_web_address,
                new_name,
                new_interval,
                url_id,
                new_is_public,
            )
            return URLRead(**dict(row))
    except HTTPException:
        raise
    except Exception:
        url = _mock_urls.get(url_id)
        if not url:
            raise HTTPException(status_code=404, detail="URL not found")

        if payload.name:
            url.name = payload.name
        if payload.web_address:
            url.web_address = str(payload.web_address)
        if payload.ping_interval_seconds is not None:
            url.ping_interval_seconds = payload.ping_interval_seconds
            url.check_interval_seconds = payload.ping_interval_seconds

        return url


@router.delete("/urls/{url_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_url(url_id: int, current_user: Annotated[UserRead, Depends(get_current_user)]) -> None:
    """Delete a monitored URL."""
    try:
        async with get_connection() as conn:
            if current_user.role == "admin":
                result = await conn.execute("DELETE FROM urls WHERE id = $1", url_id)
            else:
                result = await conn.execute("DELETE FROM urls WHERE id = $1 AND user_id = $2", url_id, current_user.id)
            
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="URL not found")
            return
    except HTTPException:
        raise
    except Exception:
        if url_id not in _mock_urls:
            raise HTTPException(status_code=404, detail="URL not found")
        del _mock_urls[url_id]
