from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..auth import get_current_user
from ..database import get_connection
from ..models import IncidentRead, IncidentUpdate, UserRead

router = APIRouter(tags=["incidents"])


def _compute_duration(started_at: datetime, resolved_at: datetime | None) -> int:
    end = resolved_at or datetime.now(timezone.utc)
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    return max(0, int((end - started_at).total_seconds() // 60))


def _row_to_incident(row: dict) -> IncidentRead:
    return IncidentRead(
        id=row["id"],
        url_id=row["url_id"],
        url_name=row["url_name"],
        url_address=row["url_address"],
        started_at=row["started_at"],
        resolved_at=row["resolved_at"],
        check_type=row["check_type"],
        severity=row["severity"],
        acknowledged_at=row["acknowledged_at"],
        note=row["note"],
        duration_minutes=_compute_duration(row["started_at"], row["resolved_at"]),
    )


@router.get("/incidents", response_model=list[IncidentRead])
async def list_incidents(
    current_user: Annotated[UserRead, Depends(get_current_user)],
    status: str = Query(default="open", pattern="^(open|resolved|all)$"),
) -> list[IncidentRead]:
    async with get_connection() as conn:
        if current_user.role == "admin":
            query = """
                SELECT i.id, i.url_id, u.name AS url_name, u.web_address AS url_address,
                       i.started_at, i.resolved_at, i.check_type, i.severity,
                       i.acknowledged_at, i.note
                FROM url_incidents i
                JOIN urls u ON u.id = i.url_id
                WHERE (
                    $1 = 'all'
                    OR ($1 = 'open'     AND i.resolved_at IS NULL)
                    OR ($1 = 'resolved' AND i.resolved_at IS NOT NULL)
                )
                ORDER BY i.started_at DESC
                LIMIT 100
            """
            rows = await conn.fetch(query, status)
        else:
            query = """
                SELECT i.id, i.url_id, u.name AS url_name, u.web_address AS url_address,
                       i.started_at, i.resolved_at, i.check_type, i.severity,
                       i.acknowledged_at, i.note
                FROM url_incidents i
                JOIN urls u ON u.id = i.url_id
                WHERE u.user_id = $1
                  AND (
                    $2 = 'all'
                    OR ($2 = 'open'     AND i.resolved_at IS NULL)
                    OR ($2 = 'resolved' AND i.resolved_at IS NOT NULL)
                  )
                ORDER BY i.started_at DESC
                LIMIT 100
            """
            rows = await conn.fetch(query, current_user.id, status)
            
        return [_row_to_incident(dict(row)) for row in rows]


@router.get("/incidents/{incident_id}", response_model=IncidentRead)
async def get_incident(
    incident_id: int,
    current_user: Annotated[UserRead, Depends(get_current_user)],
) -> IncidentRead:
    async with get_connection() as conn:
        if current_user.role == "admin":
            row = await conn.fetchrow(
                """
                SELECT i.id, i.url_id, u.name AS url_name, u.web_address AS url_address,
                       i.started_at, i.resolved_at, i.check_type, i.severity,
                       i.acknowledged_at, i.note
                FROM url_incidents i
                JOIN urls u ON u.id = i.url_id
                WHERE i.id = $1
                """,
                incident_id,
            )
        else:
            row = await conn.fetchrow(
                """
                SELECT i.id, i.url_id, u.name AS url_name, u.web_address AS url_address,
                       i.started_at, i.resolved_at, i.check_type, i.severity,
                       i.acknowledged_at, i.note
                FROM url_incidents i
                JOIN urls u ON u.id = i.url_id
                WHERE i.id = $1 AND u.user_id = $2
                """,
                incident_id,
                current_user.id,
            )
    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _row_to_incident(dict(row))


@router.patch("/incidents/{incident_id}", response_model=IncidentRead)
async def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    current_user: Annotated[UserRead, Depends(get_current_user)],
) -> IncidentRead:
    async with get_connection() as conn:
        if current_user.role == "admin":
            row = await conn.fetchrow(
                """
                UPDATE url_incidents
                SET acknowledged_at = COALESCE($1, acknowledged_at),
                    note             = COALESCE($2, note)
                WHERE id = $3
                RETURNING id, url_id, started_at, resolved_at, check_type, severity,
                          acknowledged_at, note
                """,
                payload.acknowledged_at,
                payload.note,
                incident_id,
            )
        else:
            row = await conn.fetchrow(
                """
                UPDATE url_incidents
                SET acknowledged_at = COALESCE($1, acknowledged_at),
                    note             = COALESCE($2, note)
                WHERE id = $3
                  AND url_id IN (SELECT id FROM urls WHERE user_id = $4)
                RETURNING id, url_id, started_at, resolved_at, check_type, severity,
                          acknowledged_at, note
                """,
                payload.acknowledged_at,
                payload.note,
                incident_id,
                current_user.id,
            )
            
        if not row:
            raise HTTPException(status_code=404, detail="Incident not found")

        url_row = await conn.fetchrow(
            "SELECT name, web_address FROM urls WHERE id = $1", row["url_id"]
        )

    data = dict(row)
    data["url_name"] = url_row["name"]
    data["url_address"] = url_row["web_address"]
    return _row_to_incident(data)
