import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import HTTPConnection

from .config import settings
from . import database
from .routers import urls as urls_router
from .routers.ws import router as ws_router
from .routers import auth as auth_router
from .routers import users as users_router
from .routers import incidents as incidents_router
from .routers import alerts as alerts_router
from app.redis_listener import redis_listener
from app.websocket_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.getLogger("uvicorn").info("App startup complete; database pool will initialize lazily")
    task = asyncio.create_task(redis_listener(manager))
    app.state.redis_listener_task = task
    logging.getLogger("uvicorn").info("[lifespan] Redis listener task started")
    yield
    task = app.state.redis_listener_task
    task.cancel()
    try:
        await asyncio.wait_for(task, timeout=5.0)
    except (asyncio.CancelledError, asyncio.TimeoutError):
        pass
    logging.getLogger("uvicorn").info("[lifespan] Redis listener task stopped")
    await database.close_pool()
    logging.getLogger("uvicorn").info("Database pool closed")


def api_key_dependency(connection: HTTPConnection) -> None:
    if connection.scope["type"] == "websocket":
        return

    exempt_paths = {"/healthz", "/docs", "/openapi.json", "/redoc"}
    if connection.scope["method"] == "GET" and connection.url.path in exempt_paths:
        return

    if connection.scope["method"] == "OPTIONS":
        return

    api_key = connection.headers.get("X-API-Key")
    if not api_key or api_key != settings.api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")


app = FastAPI(title="Uptime Monitor API", version="0.1.0", lifespan=lifespan, dependencies=[Depends(api_key_dependency)])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok", "environment": settings.environment}


app.include_router(auth_router.router)
app.include_router(urls_router.router, prefix="/api/v1")
app.include_router(users_router.router, prefix="/api/v1")
app.include_router(incidents_router.router, prefix="/api/v1")
app.include_router(alerts_router.router, prefix="/api/v1")
app.include_router(ws_router)
