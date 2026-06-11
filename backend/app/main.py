import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from . import database
from .routers import urls as urls_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.getLogger("uvicorn").info("App startup complete; database pool will initialize lazily")
    yield
    await database.close_pool()
    logging.getLogger("uvicorn").info("Database pool closed")


def api_key_dependency(request: Request) -> None:
    exempt_paths = {"/healthz", "/docs", "/openapi.json", "/redoc"}
    if request.method == "GET" and request.url.path in exempt_paths:
        return

    api_key = request.headers.get("X-API-Key")
    if not api_key or api_key != settings.api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")


app = FastAPI(title="Uptime Monitor API", version="0.1.0", lifespan=lifespan, dependencies=[Depends(api_key_dependency)])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok", "environment": settings.environment}


app.include_router(urls_router.router, prefix="/api/v1")
