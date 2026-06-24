from fastapi import APIRouter
from ..database import get_connection
from ..models import PublicStatusRead, PublicMonitorRead, MaintenanceWindowRead, IncidentRead

router = APIRouter(tags=["public"])

@router.get("/status", response_model=PublicStatusRead)
async def get_public_status() -> PublicStatusRead:
    async with get_connection() as conn:
        # Fetch public monitors with uptime
        monitors_query = """
            SELECT
                u.id, u.name, u.status, u.web_address,
                (
                    SELECT checked_at
                    FROM ping_history
                    WHERE url_id = u.id
                    ORDER BY checked_at DESC
                    LIMIT 1
                ) as last_checked_at,
                COALESCE(
                    (
                        SELECT COUNT(*) FILTER (WHERE is_up = true)::float / NULLIF(COUNT(*), 0) * 100
                        FROM ping_history
                        WHERE url_id = u.id AND checked_at >= NOW() - INTERVAL '90 days'
                    ), 100.0
                ) as uptime_90d
            FROM urls u
            WHERE u.is_public = true
        """
        monitors_rows = await conn.fetch(monitors_query)
        
        # Fetch active incidents for public monitors
        incidents_query = """
            SELECT i.id, i.url_id, u.name AS url_name, u.web_address AS url_address,
                   i.started_at, i.resolved_at, i.check_type, i.severity,
                   i.acknowledged_at, i.note
            FROM url_incidents i
            JOIN urls u ON u.id = i.url_id
            WHERE u.is_public = true AND i.resolved_at IS NULL
        """
        incidents_rows = await conn.fetch(incidents_query)
        
        # Map incidents by url_id
        incidents_map = {}
        for row in incidents_rows:
            incidents_map[row["url_id"]] = IncidentRead(
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
                duration_minutes=0, # Active incident
            )
            
        public_monitors = []
        for row in monitors_rows:
            public_monitors.append(PublicMonitorRead(
                id=row["id"],
                name=row["name"],
                status=row["status"],
                uptime_90d=round(row["uptime_90d"], 4),
                last_checked_at=row["last_checked_at"],
                open_incident=incidents_map.get(row["id"])
            ))

        # Fetch active or upcoming maintenance windows (starts within 24h)
        maintenance_query = """
            SELECT m.id, m.url_id, m.title, m.message, m.starts_at, m.ends_at
            FROM maintenance_windows m
            JOIN urls u ON u.id = m.url_id
            WHERE u.is_public = true AND m.ends_at > NOW() AND m.starts_at < NOW() + INTERVAL '24 hours'
            ORDER BY m.starts_at ASC
        """
        maintenance_rows = await conn.fetch(maintenance_query)
        maintenance_windows = [
            MaintenanceWindowRead(
                id=row["id"],
                url_id=row["url_id"],
                title=row["title"],
                message=row["message"],
                starts_at=row["starts_at"],
                ends_at=row["ends_at"]
            )
            for row in maintenance_rows
        ]
        
        return PublicStatusRead(
            monitors=public_monitors,
            maintenance_windows=maintenance_windows
        )
