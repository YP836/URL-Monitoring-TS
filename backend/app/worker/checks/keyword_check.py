from datetime import datetime

import httpx

from .base import CheckResult


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"


def run_keyword_check(url_id: int, web_address: str, keyword: str) -> CheckResult:
    keyword_found = False
    status_code: int | None = None

    try:
        timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "UptimeMonitor/1.0"},
        ) as client:
            response = client.get(web_address)
        status_code = response.status_code
        keyword_found = keyword.lower() in response.text.lower()
        status = "UP" if keyword_found else "DOWN"
    except Exception:
        status = "DOWN"

    return CheckResult(
        url_id=url_id,
        check_type="KEYWORD",
        status=status,
        latency_ms=None,
        extra_data={"keyword_found": keyword_found, "keyword": keyword, "status_code": status_code},
        checked_at=_utc_timestamp(),
    )
