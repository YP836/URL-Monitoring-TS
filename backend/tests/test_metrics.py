from datetime import datetime, timedelta, timezone
from app.services.metrics import (
    calculate_uptime_pct,
    calculate_error_rate_pct,
    calculate_avg_response_time_ms,
    calculate_total_downtime_minutes
)

def test_calculate_uptime_and_error():
    pings = [
        {"is_up": True}, {"is_up": True}, {"is_up": True}, {"is_up": True}, {"is_up": True},
        {"is_up": True}, {"is_up": True}, {"is_up": True}, {"is_up": True}, {"is_up": False}
    ]
    uptime = calculate_uptime_pct(pings)
    assert uptime == 90.0
    assert calculate_error_rate_pct(uptime) == 10.0

    assert calculate_uptime_pct([]) == 100.0

def test_calculate_avg_response_time_ms():
    pings = [
        {"response_time_ms": 100},
        {"response_time_ms": 200},
        {"response_time_ms": None}
    ]
    assert calculate_avg_response_time_ms(pings) == 150.0
    assert calculate_avg_response_time_ms([{"response_time_ms": None}]) is None
    assert calculate_avg_response_time_ms([]) is None

def test_calculate_total_downtime_minutes():
    now = datetime.now(timezone.utc)
    start_range = now - timedelta(hours=24)
    
    incidents = [
        {
            "started_at": now - timedelta(hours=2),
            "resolved_at": now - timedelta(hours=2, minutes=-5)  # 5 mins
        },
        {
            "started_at": now - timedelta(hours=1),
            "resolved_at": now - timedelta(hours=1, minutes=-5)  # 5 mins
        }
    ]
    assert calculate_total_downtime_minutes(incidents, start_range, now) == 10

    # Overlapping the range start
    incidents_edge = [
        {
            "started_at": start_range - timedelta(minutes=10),
            "resolved_at": start_range + timedelta(minutes=10) # Only 10 mins inside range
        }
    ]
    assert calculate_total_downtime_minutes(incidents_edge, start_range, now) == 10

    # Open incident
    incidents_open = [
        {
            "started_at": now - timedelta(minutes=15),
            "resolved_at": None # Open
        }
    ]
    assert calculate_total_downtime_minutes(incidents_open, start_range, now) == 15
