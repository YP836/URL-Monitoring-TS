import time
from datetime import datetime
from urllib.parse import urljoin

import httpx

from .base import CheckResult
from .ssrf import SSRFError, validate_public_url

# Redirects are followed manually so every hop's destination can be SSRF-checked
# before we connect to it (httpx's follow_redirects=True would hide the hops).
MAX_REDIRECTS = 5
_REDIRECT_CODES = {301, 302, 303, 307, 308}
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
}


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"


def run_http_check(url_id: int, web_address: str) -> CheckResult:
    start = time.monotonic()
    timeout = httpx.Timeout(connect=5.0, read=8.0, write=5.0, pool=5.0)

    response_time_ms: int | None = None
    status_code: int | None = None
    error_reason: str | None = None
    is_up = False

    try:
        # SSRF guard: reject private/internal/metadata targets before connecting.
        validate_public_url(web_address, resolve_dns=True)

        current = web_address
        redirects = 0
        with httpx.Client(timeout=timeout, follow_redirects=False, headers=_HEADERS) as client:
            while True:
                response = client.get(current)
                status_code = response.status_code

                if status_code in _REDIRECT_CODES and "location" in response.headers:
                    redirects += 1
                    if redirects > MAX_REDIRECTS:
                        error_reason = "Too many redirects"
                        status_code = None
                        break
                    next_url = urljoin(current, response.headers["location"])
                    validate_public_url(next_url, resolve_dns=True)  # re-check every hop
                    current = next_url
                    continue

                response_time_ms = int((time.monotonic() - start) * 1000)
                is_up = 200 <= status_code < 400
                if not is_up:
                    error_reason = f"HTTP {status_code}"
                break
    except SSRFError as exc:
        error_reason = f"Blocked (SSRF): {exc}"
    except httpx.TimeoutException:
        error_reason = "Connection timed out"
    except httpx.ConnectError:
        error_reason = "Connection failed (DNS or refused)"
    except httpx.TooManyRedirects:
        error_reason = "Too many redirects"
    except httpx.HTTPError as exc:
        error_reason = type(exc).__name__

    return CheckResult(
        url_id=url_id,
        check_type="HTTP",
        status="UP" if is_up else "DOWN",
        latency_ms=response_time_ms,
        extra_data={"status_code": status_code, "error": error_reason},
        checked_at=_utc_timestamp(),
    )
