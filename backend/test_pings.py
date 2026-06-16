import asyncio
from app.database import get_connection

async def main():
    async with get_connection() as c:
        rows = await c.fetch("SELECT url_id, is_up, response_time_ms, status_code FROM ping_history ORDER BY checked_at DESC LIMIT 15")
        for r in rows:
            print(dict(r))

asyncio.run(main())
