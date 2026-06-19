from __future__ import annotations

import os
from dataclasses import dataclass

import psycopg2

from app.config import settings
from app.worker.tasks import _run_check, _write_check_results


CHECK_TYPE = "HTTP,SSL_EXPIRY,TTFB,DOWNTIME_DURATION,ERROR_RATE"


@dataclass(frozen=True)
class SeedMonitor:
    name: str
    web_address: str
    interval_seconds: int = 300


MONITORS = [
    SeedMonitor("Google Search", "https://www.google.com/"),
    SeedMonitor("GitHub", "https://github.com/"),
    SeedMonitor("Microsoft", "https://www.microsoft.com/"),
    SeedMonitor("Amazon Web Services", "https://aws.amazon.com/"),
    SeedMonitor("Cloudflare", "https://www.cloudflare.com/"),
    SeedMonitor("Stripe", "https://stripe.com/"),
    SeedMonitor("Shopify", "https://www.shopify.com/"),
    SeedMonitor("Slack", "https://slack.com/"),
    SeedMonitor("Atlassian", "https://www.atlassian.com/"),
    SeedMonitor("Notion", "https://www.notion.so/"),
    SeedMonitor("Figma", "https://www.figma.com/"),
    SeedMonitor("Linear", "https://linear.app/"),
    SeedMonitor("Vercel", "https://vercel.com/"),
    SeedMonitor("Netlify", "https://www.netlify.com/"),
    SeedMonitor("Supabase", "https://supabase.com/"),
    SeedMonitor("OpenAI Status", "https://status.openai.com/"),
    SeedMonitor("Docker", "https://www.docker.com/"),
    SeedMonitor("Postman", "https://www.postman.com/"),
    SeedMonitor("Twilio", "https://www.twilio.com/"),
    SeedMonitor("Datadog", "https://www.datadoghq.com/"),
]


def get_seed_user_id(conn) -> int:
    requested_email = os.getenv("SEED_USER_EMAIL")
    with conn.cursor() as cur:
        if requested_email:
            cur.execute("SELECT id FROM users WHERE email = %s", (requested_email,))
        else:
            cur.execute("SELECT id FROM users ORDER BY created_at DESC LIMIT 1")
        row = cur.fetchone()

    if row is None:
        raise RuntimeError("No user exists. Sign up once before seeding monitors.")
    return int(row[0])


def upsert_monitor(conn, user_id: int, monitor: SeedMonitor) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO urls
                (
                    user_id, web_address, name, status, created_at, check_type,
                    check_interval_seconds, ping_interval_seconds
                )
            VALUES (%s, %s, %s, 'PENDING', NOW(), %s, %s, %s)
            ON CONFLICT (user_id, web_address)
            DO UPDATE SET
                name = EXCLUDED.name,
                check_type = EXCLUDED.check_type,
                check_interval_seconds = EXCLUDED.check_interval_seconds,
                ping_interval_seconds = EXCLUDED.ping_interval_seconds
            RETURNING id
            """,
            (
                user_id,
                monitor.web_address,
                monitor.name,
                CHECK_TYPE,
                monitor.interval_seconds,
                monitor.interval_seconds,
            ),
        )
        row = cur.fetchone()
    conn.commit()
    return int(row[0])


def seed() -> None:
    conn = psycopg2.connect(settings.database_url)
    try:
        user_id = get_seed_user_id(conn)
        print(f"Seeding {len(MONITORS)} monitors for user_id={user_id}")

        for monitor in MONITORS:
            url_id = upsert_monitor(conn, user_id, monitor)
            primary_results = [
                _run_check(url_id, monitor.web_address, "HTTP", None),
                _run_check(url_id, monitor.web_address, "SSL_EXPIRY", None),
                _run_check(url_id, monitor.web_address, "TTFB", None),
            ]
            _write_check_results(primary_results)

            computed_results = [
                _run_check(url_id, monitor.web_address, "DOWNTIME_DURATION", None),
                _run_check(url_id, monitor.web_address, "ERROR_RATE", None),
            ]
            _write_check_results(computed_results)
            print(f"Seeded {monitor.name} ({monitor.web_address})")
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
