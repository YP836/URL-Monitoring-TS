"""Alert delivery helpers (email + webhook).

These are pure, synchronous functions used by the Celery worker. Each raises on
failure so the caller can record a FAILED delivery row with the error text.
"""
import smtplib
from datetime import datetime
from email.message import EmailMessage
from typing import Any

import httpx

from app.config import settings


class NotConfiguredError(RuntimeError):
    """Raised when a channel cannot be delivered because config is missing."""


def send_email(to: str, subject: str, text: str, html: str | None = None) -> None:
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        raise NotConfiguredError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD."
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from or settings.smtp_user
    message["To"] = to
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        if settings.smtp_use_tls:
            server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)


def send_webhook(url: str, text: str, payload: dict[str, Any]) -> None:
    """POST an alert to a webhook, auto-formatting for Discord/Slack/generic."""
    lower = url.lower()
    if "discord.com/api/webhooks" in lower or "discordapp.com/api/webhooks" in lower:
        body: dict[str, Any] = {"content": text}
    elif "hooks.slack.com" in lower:
        body = {"text": text}
    else:
        body = {"text": text, **payload}

    response = httpx.post(url, json=body, timeout=10)
    response.raise_for_status()


def build_alert_message(
    event_type: str,
    name: str,
    address: str,
    severity: str | None = None,
    started_at: datetime | None = None,
    duration_min: int | None = None,
) -> tuple[str, str, str]:
    """Return (subject, text, html) for an alert event."""
    if event_type == "DOWN":
        emoji = "🔴"
        headline = f"{name} is DOWN"
        lead = f"The monitor for {name} is reporting a problem ({severity or 'DOWN'})."
    elif event_type == "UP":
        emoji = "🟢"
        headline = f"{name} has recovered"
        lead = f"The monitor for {name} is back UP."
        if duration_min is not None:
            lead += f" Downtime lasted about {duration_min} minute(s)."
    else:  # TEST
        emoji = "🔔"
        headline = "Test alert"
        lead = f"This is a test notification for {name}. Your channel works!"

    subject = f"{emoji} {headline}"
    when = (started_at or datetime.utcnow()).strftime("%Y-%m-%d %H:%M UTC")
    text = (
        f"{headline}\n\n"
        f"{lead}\n\n"
        f"URL: {address}\n"
        f"Time: {when}\n"
    )
    html = (
        f"<div style=\"font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px\">"
        f"<h2 style=\"margin:0 0 8px\">{emoji} {headline}</h2>"
        f"<p style=\"color:#374151;margin:0 0 16px\">{lead}</p>"
        f"<table style=\"font-size:14px;color:#111827\">"
        f"<tr><td style=\"color:#6B7280;padding-right:12px\">URL</td>"
        f"<td><a href=\"{address}\">{address}</a></td></tr>"
        f"<tr><td style=\"color:#6B7280;padding-right:12px\">Time</td><td>{when}</td></tr>"
        f"</table>"
        f"<p style=\"color:#9CA3AF;font-size:12px;margin-top:20px\">Uptime Monitor</p>"
        f"</div>"
    )
    return subject, text, html
