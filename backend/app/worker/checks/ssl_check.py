import socket
import ssl
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse

from .base import CheckResult


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _issuer_name(issuer: tuple | None) -> str | None:
    if not issuer:
        return None

    parts: list[str] = []
    for group in issuer:
        for key, value in group:
            parts.append(f"{key}={value}")
    return ", ".join(parts) if parts else None


def run_ssl_check(url_id: int, web_address: str) -> CheckResult:
    days_remaining: int | None = None
    expiry_date: str | None = None
    issuer: str | None = None
    is_valid = False
    status = "DOWN"

    try:
        parsed = urlparse(web_address)
        hostname = parsed.hostname
        if hostname is None:
            raise ValueError("URL has no hostname")

        port = parsed.port or 443
        context = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as tls_sock:
                cert = tls_sock.getpeercert()

        not_after = cert.get("notAfter")
        if not not_after:
            raise ValueError("Certificate missing notAfter")

        expires_at = parsedate_to_datetime(not_after)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        days_remaining = max(0, int((expires_at - now).total_seconds() // 86400))
        expiry_date = expires_at.isoformat()
        issuer = _issuer_name(cert.get("issuer"))
        is_valid = days_remaining >= 0

        if days_remaining > 30:
            status = "UP"
        elif days_remaining >= 7:
            status = "WARN"
        else:
            status = "DOWN"
    except Exception:
        days_remaining = None
        expiry_date = None
        issuer = None
        is_valid = False
        status = "DOWN"

    return CheckResult(
        url_id=url_id,
        check_type="SSL_EXPIRY",
        status=status,
        latency_ms=None,
        extra_data={
            "days_remaining": days_remaining,
            "expiry_date": expiry_date,
            "is_valid": is_valid,
            "issuer": issuer,
        },
        checked_at=_utc_timestamp(),
    )
