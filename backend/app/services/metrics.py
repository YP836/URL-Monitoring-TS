from datetime import datetime, timezone
from typing import Any

def calculate_uptime_pct(pings: list[dict[str, Any]]) -> float:
    if not pings:
        return 100.0
    up_count = sum(1 for p in pings if p.get("is_up"))
    return round((up_count / len(pings)) * 100, 4)

def calculate_error_rate_pct(uptime_pct: float) -> float:
    return round(100.0 - uptime_pct, 4)

def calculate_avg_response_time_ms(pings: list[dict[str, Any]]) -> float | None:
    valid_times = [p["response_time_ms"] for p in pings if p.get("response_time_ms") is not None]
    if not valid_times:
        return None
    return round(sum(valid_times) / len(valid_times), 2)

def calculate_total_downtime_minutes(incidents: list[dict[str, Any]], range_start: datetime, range_end: datetime) -> int:
    total_minutes = 0
    if range_start.tzinfo is None:
        range_start = range_start.replace(tzinfo=timezone.utc)
    if range_end.tzinfo is None:
        range_end = range_end.replace(tzinfo=timezone.utc)

    for inc in incidents:
        start = inc["started_at"]
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        
        end = inc.get("resolved_at")
        if end is None:
            end = range_end
        elif end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
            
        overlap_start = max(start, range_start)
        overlap_end = min(end, range_end)
        
        if overlap_end > overlap_start:
            total_minutes += int((overlap_end - overlap_start).total_seconds() // 60)
            
    return total_minutes
