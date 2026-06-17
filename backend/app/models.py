from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl, model_validator


CHECK_TYPES = {"HTTP", "SSL_EXPIRY", "TTFB", "KEYWORD", "DOWNTIME_DURATION", "ERROR_RATE"}


def parse_check_types(value: str) -> list[str]:
    checks = [item.strip().upper() for item in value.split(",") if item.strip()]
    return checks or ["HTTP"]


class URLCreate(BaseModel):
    web_address: HttpUrl
    name: str = Field(..., min_length=1, max_length=100)
    check_type: str = "HTTP"
    keyword_to_find: str | None = None
    check_interval_seconds: int = 30
    ping_interval_seconds: int = 30

    @model_validator(mode="after")
    def validate_keyword_check(self) -> "URLCreate":
        checks = parse_check_types(self.check_type)
        unknown_checks = [check for check in checks if check not in CHECK_TYPES]
        if unknown_checks:
            raise ValueError(f"Unknown check_type: {', '.join(unknown_checks)}")
        self.check_type = ",".join(checks)

        if "KEYWORD" in checks and not self.keyword_to_find:
            raise ValueError("keyword_to_find required for KEYWORD checks")
        return self


class URLRead(BaseModel):
    id: int
    web_address: str
    name: str
    status: str = "PENDING"
    created_at: datetime
    check_type: str = "HTTP"
    keyword_to_find: str | None = None
    check_interval_seconds: int = 30
    ping_interval_seconds: int = 30


class URLUpdate(BaseModel):
    web_address: HttpUrl | None = None
    name: str | None = Field(None, min_length=1, max_length=100)
    ping_interval_seconds: int | None = None


class URLDetail(URLRead):
    recent_pings: list["PingHistoryRead"] = []


class PingHistoryRead(BaseModel):
    id: int
    url_id: int
    checked_at: datetime
    response_time_ms: int | None
    status_code: int | None
    is_up: bool
    check_type: str | None = None
    extra_data: dict[str, Any] | None = None


class URLExtraData(BaseModel):
    check_type: str
    extra_data: dict[str, Any]
    checked_at: datetime
