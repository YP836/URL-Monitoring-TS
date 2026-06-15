import time
from datetime import datetime

import httpx

from .base import CheckResult


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"


def run_http_check(url_id: int, web_address: str) -> CheckResult:
    start = time.monotonic()
    timeout = httpx.Timeout(connect=5.0, read=8.0, write=5.0, pool=5.0)

    try:
        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "UptimeMonitor/1.0"},
        ) as client:
            response = client.get(web_address)
        response_time_ms = int((time.monotonic() - start) * 1000)
        status_code = response.status_code
        is_up = 200 <= status_code < 400
    except (
        httpx.TimeoutException,
        httpx.ConnectError,
        httpx.TooManyRedirects,
    ):
        response_time_ms = None
        status_code = None
        is_up = False
    except httpx.HTTPError:
        raise

    return CheckResult(
        url_id=url_id,
        check_type="HTTP",
        status="UP" if is_up else "DOWN",
        latency_ms=response_time_ms,
        extra_data={"status_code": status_code},
        checked_at=_utc_timestamp(),
    )
