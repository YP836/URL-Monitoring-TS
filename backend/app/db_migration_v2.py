import sys
import traceback

import psycopg2

from app.config import settings


MIGRATION_SQL = """
ALTER TABLE urls
  ADD COLUMN IF NOT EXISTS check_type VARCHAR(160) NOT NULL DEFAULT 'HTTP',
  ADD COLUMN IF NOT EXISTS keyword_to_find VARCHAR(255),
  ADD COLUMN IF NOT EXISTS check_interval_seconds INTEGER NOT NULL DEFAULT 30;

ALTER TABLE urls
  ALTER COLUMN check_type TYPE VARCHAR(160);

ALTER TABLE ping_history
  ADD COLUMN IF NOT EXISTS check_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS extra_data JSONB;

CREATE TABLE IF NOT EXISTS url_incidents (
  id           SERIAL PRIMARY KEY,
  url_id       INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL,
  resolved_at  TIMESTAMPTZ,
  check_type   VARCHAR(20) NOT NULL,
  severity     VARCHAR(10) NOT NULL
);
"""


def main() -> None:
    conn = None
    try:
        conn = psycopg2.connect(settings.database_url)
        with conn.cursor() as cur:
            cur.execute(MIGRATION_SQL)
        conn.commit()
    except Exception:
        if conn is not None:
            conn.rollback()
        traceback.print_exc()
        sys.exit(1)
    finally:
        if conn is not None:
            conn.close()

    print("Migration v2 complete")


if __name__ == "__main__":
    main()
