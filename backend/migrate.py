import psycopg2
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/uptime_monitor")

def run_migration():
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        print("Adding is_public column to urls table...")
        cur.execute("ALTER TABLE urls ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false")
        
        print("Creating maintenance_windows table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_windows (
                id SERIAL PRIMARY KEY,
                url_id INTEGER REFERENCES urls(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                starts_at TIMESTAMPTZ NOT NULL,
                ends_at TIMESTAMPTZ NOT NULL
            )
        """)
        
        print("Migration successful!")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
