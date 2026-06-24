from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from starlette.concurrency import run_in_threadpool

from ..auth import get_current_user
from ..database import get_connection
from ..models import (
    AlertChannelCreate,
    AlertChannelRead,
    AlertChannelUpdate,
    AlertDeliveryRead,
    UserRead,
)

router = APIRouter(tags=["alerts"])


_CHANNEL_SELECT = """
    SELECT c.id, c.channel_type, c.name, c.destination,
           c.notify_on_down, c.notify_on_recovery, c.is_enabled, c.created_at,
           d.status AS last_delivery_status, d.created_at AS last_delivery_at
    FROM alert_channels c
    LEFT JOIN LATERAL (
        SELECT status, created_at
        FROM alert_deliveries
        WHERE channel_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) d ON true
"""


@router.get("/alerts/channels", response_model=list[AlertChannelRead])
async def list_channels(
    current_user: Annotated[UserRead, Depends(get_current_user)],
) -> list[AlertChannelRead]:
    async with get_connection() as conn:
        rows = await conn.fetch(
            _CHANNEL_SELECT + " WHERE c.user_id = $1 ORDER BY c.created_at DESC",
            current_user.id,
        )
    return [AlertChannelRead(**dict(row)) for row in rows]


@router.post("/alerts/channels", response_model=AlertChannelRead, status_code=status.HTTP_201_CREATED)
async def create_channel(
    payload: AlertChannelCreate,
    current_user: Annotated[UserRead, Depends(get_current_user)],
) -> AlertChannelRead:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO alert_channels
                (user_id, channel_type, name, destination, notify_on_down, notify_on_recovery)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, channel_type, name, destination,
                      notify_on_down, notify_on_recovery, is_enabled, created_at
            """,
            current_user.id,
            payload.channel_type,
            payload.name,
            payload.destination,
            payload.notify_on_down,
            payload.notify_on_recovery,
        )
    return AlertChannelRead(**dict(row))


@router.patch("/alerts/channels/{channel_id}", response_model=AlertChannelRead)
async def update_channel(
    channel_id: int,
    payload: AlertChannelUpdate,
    current_user: Annotated[UserRead, Depends(get_current_user)],
) -> AlertChannelRead:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            UPDATE alert_channels
            SET name               = COALESCE($1, name),
                destination        = COALESCE($2, destination),
                notify_on_down     = COALESCE($3, notify_on_down),
                notify_on_recovery = COALESCE($4, notify_on_recovery),
                is_enabled         = COALESCE($5, is_enabled)
            WHERE id = $6 AND user_id = $7
            RETURNING id, channel_type, name, destination,
                      notify_on_down, notify_on_recovery, is_enabled, created_at
            """,
            payload.name,
            payload.destination,
            payload.notify_on_down,
            payload.notify_on_recovery,
            payload.is_enabled,
            channel_id,
            current_user.id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Alert channel not found")
    return AlertChannelRead(**dict(row))


@router.delete("/alerts/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: int,
    current_user: Annotated[UserRead, Depends(get_current_user)],
) -> None:
    async with get_connection() as conn:
        result = await conn.execute(
            "DELETE FROM alert_channels WHERE id = $1 AND user_id = $2",
            channel_id,
            current_user.id,
        )
    if result.endswith("0"):
        raise HTTPException(status_code=404, detail="Alert channel not found")


@router.post("/alerts/channels/{channel_id}/test", response_model=AlertDeliveryRead)
async def test_channel(
    channel_id: int,
    current_user: Annotated[UserRead, Depends(get_current_user)],
) -> AlertDeliveryRead:
    """Send a test notification immediately and return the real result."""
    from ..worker.notifications import build_alert_message, send_email, send_webhook

    async with get_connection() as conn:
        channel = await conn.fetchrow(
            """
            SELECT id, channel_type, name, destination
            FROM alert_channels
            WHERE id = $1 AND user_id = $2
            """,
            channel_id,
            current_user.id,
        )
        if not channel:
            raise HTTPException(status_code=404, detail="Alert channel not found")

        subject, text, html = build_alert_message(
            "TEST", channel["name"], channel["destination"]
        )
        send_status = "SENT"
        error: str | None = None
        try:
            if channel["channel_type"] == "EMAIL":
                await run_in_threadpool(send_email, channel["destination"], subject, text, html)
            else:
                payload = {"event": "TEST", "channel": channel["name"]}
                await run_in_threadpool(send_webhook, channel["destination"], text, payload)
        except Exception as exc:  # noqa: BLE001 - record the real failure for the user
            send_status = "FAILED"
            error = str(exc)[:500]

        row = await conn.fetchrow(
            """
            INSERT INTO alert_deliveries (channel_id, event_type, status, error)
            VALUES ($1, 'TEST', $2, $3)
            RETURNING id, channel_id, event_type, status, error, created_at
            """,
            channel_id,
            send_status,
            error,
        )

    data = dict(row)
    data["channel_name"] = channel["name"]
    return AlertDeliveryRead(**data)


@router.get("/alerts/deliveries", response_model=list[AlertDeliveryRead])
async def list_deliveries(
    current_user: Annotated[UserRead, Depends(get_current_user)],
) -> list[AlertDeliveryRead]:
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT d.id, d.channel_id, c.name AS channel_name, u.name AS url_name,
                   d.event_type, d.status, d.error, d.created_at
            FROM alert_deliveries d
            JOIN alert_channels c ON c.id = d.channel_id
            LEFT JOIN urls u ON u.id = d.url_id
            WHERE c.user_id = $1
            ORDER BY d.created_at DESC
            LIMIT 50
            """,
            current_user.id,
        )
    return [AlertDeliveryRead(**dict(row)) for row in rows]
