import sys
import traceback
import psycopg2
from app.config import settings

MIGRATION_SQL = """
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE urls
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
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

    print("Migration v3 complete")

if __name__ == "__main__":
    main()
