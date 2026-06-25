import time
from datetime import datetime

import httpx

from .base import CheckResult


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"


def run_http_check(url_id: int, web_address: str) -> CheckResult:
    start = time.monotonic()
    timeout = httpx.Timeout(connect=5.0, read=8.0, write=5.0, pool=5.0)

    error_reason: str | None = None
    try:
        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"},
        ) as client:
            response = client.get(web_address)
        response_time_ms = int((time.monotonic() - start) * 1000)
        status_code = response.status_code
        is_up = 200 <= status_code < 400
        if not is_up:
            error_reason = f"HTTP {status_code}"
    except httpx.TimeoutException:
        response_time_ms = None
        status_code = None
        is_up = False
        error_reason = "Connection timed out"
    except httpx.ConnectError:
        response_time_ms = None
        status_code = None
        is_up = False
        error_reason = "Connection failed (DNS or refused)"
    except httpx.TooManyRedirects:
        response_time_ms = None
        status_code = None
        is_up = False
        error_reason = "Too many redirects"
    except httpx.HTTPError as exc:
        response_time_ms = None
        status_code = None
        is_up = False
        error_reason = type(exc).__name__

    return CheckResult(
        url_id=url_id,
        check_type="HTTP",
        status="UP" if is_up else "DOWN",
        latency_ms=response_time_ms,
        extra_data={"status_code": status_code, "error": error_reason},
        checked_at=_utc_timestamp(),
    )
