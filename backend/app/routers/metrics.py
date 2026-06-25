from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_user
from ..database import get_connection
from ..models import MonitorMetrics, UserRead
from ..services.metrics import (
    calculate_uptime_pct,
    calculate_error_rate_pct,
    calculate_avg_response_time_ms,
    calculate_total_downtime_minutes
)

router = APIRouter(tags=["metrics"])

@router.get("/urls/{url_id}/metrics", response_model=MonitorMetrics)
async def get_monitor_metrics(
    url_id: int,
    current_user: Annotated[UserRead, Depends(get_current_user)],
    range: str = Query(default="24h", pattern="^(24h|7d|30d|90d)$")
):
    now = datetime.now(timezone.utc)
    if range == "24h":
        start_time = now - timedelta(hours=24)
    elif range == "7d":
        start_time = now - timedelta(days=7)
    elif range == "30d":
        start_time = now - timedelta(days=30)
    else:
        start_time = now - timedelta(days=90)

    async with get_connection() as conn:
        if current_user.role == "admin":
            url_row = await conn.fetchrow("SELECT id, status FROM urls WHERE id = $1", url_id)
        else:
            url_row = await conn.fetchrow(
                "SELECT id, status FROM urls WHERE id = $1 AND user_id = $2", 
                url_id, current_user.id
            )
            
        if not url_row:
            raise HTTPException(status_code=404, detail="Monitor not found")
            
        pings = await conn.fetch(
            "SELECT is_up, response_time_ms FROM ping_history WHERE url_id = $1 AND checked_at >= $2",
            url_id, start_time
        )
        
        incidents = await conn.fetch(
            """
            SELECT started_at, resolved_at 
            FROM url_incidents 
            WHERE url_id = $1 AND started_at <= $2 AND (resolved_at IS NULL OR resolved_at >= $3)
            """,
            url_id, now, start_time
        )

    ping_dicts = [dict(p) for p in pings]
    incident_dicts = [dict(i) for i in incidents]
    
    uptime_pct = calculate_uptime_pct(ping_dicts)
    error_rate_pct = calculate_error_rate_pct(uptime_pct)
    avg_response_time_ms = calculate_avg_response_time_ms(ping_dicts)
    
    incident_count = sum(1 for i in incident_dicts if i["started_at"].replace(tzinfo=timezone.utc) >= start_time)
    
    total_downtime_minutes = calculate_total_downtime_minutes(incident_dicts, start_time, now)
    
    return MonitorMetrics(
        monitor_id=url_id,
        range=range,
        uptime_pct=uptime_pct,
        error_rate_pct=error_rate_pct,
        avg_response_time_ms=avg_response_time_ms,
        incident_count=incident_count,
        total_downtime_minutes=total_downtime_minutes,
        current_status=url_row["status"]
    )
