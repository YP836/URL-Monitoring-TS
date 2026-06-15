import time
from datetime import datetime

import httpx

from .base import CheckResult


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"


def run_ttfb_check(url_id: int, web_address: str) -> CheckResult:
    start = time.monotonic()
    ttfb_ms: int | None = None
    total_ms: int | None = None
    status_code: int | None = None

    try:
        timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            with client.stream("GET", web_address, headers={"User-Agent": "UptimeMonitor/1.0"}) as response:
                status_code = response.status_code
                for _ in response.iter_bytes():
                    ttfb_ms = int((time.monotonic() - start) * 1000)
                    break
                if ttfb_ms is None:
                    ttfb_ms = int((time.monotonic() - start) * 1000)
        total_ms = int((time.monotonic() - start) * 1000)

        if ttfb_ms < 200:
            status = "UP"
        elif ttfb_ms < 800:
            status = "WARN"
        else:
            status = "DOWN"
    except Exception:
        status = "DOWN"

    return CheckResult(
        url_id=url_id,
        check_type="TTFB",
        status=status,
        latency_ms=total_ms,
        extra_data={"ttfb_ms": ttfb_ms, "total_ms": total_ms, "status_code": status_code},
        checked_at=_utc_timestamp(),
    )
