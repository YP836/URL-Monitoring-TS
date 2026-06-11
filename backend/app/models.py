from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl


class URLCreate(BaseModel):
    web_address: HttpUrl
    name: str = Field(..., min_length=1, max_length=100)


class URLRead(BaseModel):
    id: int
    web_address: str
    name: str
    status: str = "PENDING"
    created_at: datetime


class PingHistoryRead(BaseModel):
    id: int
    url_id: int
    checked_at: datetime
    response_time_ms: int | None
    status_code: int | None
    is_up: bool
