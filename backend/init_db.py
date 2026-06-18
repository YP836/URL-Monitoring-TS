import psycopg2
from urllib.parse import urlparse

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/uptime_monitor"

def init_db():
    try:
        print("Connecting to PostgreSQL...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Creating 'users' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(150) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("Creating 'urls' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS urls (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                web_address VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                check_type VARCHAR(160) NOT NULL DEFAULT 'HTTP',
                keyword_to_find VARCHAR(255),
                check_interval_seconds INTEGER NOT NULL DEFAULT 30,
                ping_interval_seconds INTEGER NOT NULL DEFAULT 30,
                last_pinged_at TIMESTAMPTZ
            )
        """)
        
        print("Creating 'ping_history' table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS ping_history (
                id SERIAL PRIMARY KEY,
                url_id INTEGER REFERENCES urls(id) ON DELETE CASCADE,
                checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                response_time_ms INTEGER,
                status_code INTEGER,
                is_up BOOLEAN NOT NULL
            )
        """)
        
        print("Successfully initialized all database tables!")
        cur.close()
        conn.close()
    except psycopg2.OperationalError as e:
        if 'database "uptime_monitor" does not exist' in str(e):
            print("Database 'uptime_monitor' does not exist! Creating it automatically...")
            # Connect to the default 'postgres' database to issue the CREATE DATABASE command
            conn_default = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/postgres")
            conn_default.autocommit = True
            cur_default = conn_default.cursor()
            cur_default.execute("CREATE DATABASE uptime_monitor")
            cur_default.close()
            conn_default.close()
            
            # Now that it's created, try again!
            print("Database created. Retrying table creation...")
            init_db()
        else:
            print(f"Failed to connect: {e}")

if __name__ == "__main__":
    init_db()
