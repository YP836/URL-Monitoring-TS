from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, HttpUrl, model_validator


class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str = "viewer"
    created_at: datetime

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
    owner_email: str | None = None
    is_public: bool = False


class URLUpdate(BaseModel):
    web_address: HttpUrl | None = None
    name: str | None = Field(None, min_length=1, max_length=100)
    ping_interval_seconds: int | None = None
    is_public: bool | None = None


class AdminUserOverview(UserRead):
    url_count: int


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    role: str | None = None


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


class IncidentRead(BaseModel):
    id: int
    url_id: int
    url_name: str
    url_address: str
    started_at: datetime
    resolved_at: datetime | None
    check_type: str
    severity: str
    acknowledged_at: datetime | None
    note: str | None
    duration_minutes: int | None


class IncidentUpdate(BaseModel):
    acknowledged_at: datetime | None = None
    note: str | None = None


class AlertChannelCreate(BaseModel):
    channel_type: str = Field(..., pattern="^(EMAIL|WEBHOOK)$")
    name: str = Field(..., min_length=1, max_length=100)
    destination: str = Field(..., min_length=1)
    notify_on_down: bool = True
    notify_on_recovery: bool = True

    @model_validator(mode="after")
    def validate_destination(self) -> "AlertChannelCreate":
        dest = self.destination.strip()
        if self.channel_type == "EMAIL":
            if "@" not in dest or "." not in dest.split("@")[-1]:
                raise ValueError("destination must be a valid email address")
        elif self.channel_type == "WEBHOOK":
            if not (dest.startswith("http://") or dest.startswith("https://")):
                raise ValueError("destination must be an http(s) webhook URL")
        self.destination = dest
        return self


class AlertChannelUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    destination: str | None = Field(None, min_length=1)
    notify_on_down: bool | None = None
    notify_on_recovery: bool | None = None
    is_enabled: bool | None = None


class AlertChannelRead(BaseModel):
    id: int
    channel_type: str
    name: str
    destination: str
    notify_on_down: bool
    notify_on_recovery: bool
    is_enabled: bool
    created_at: datetime
    last_delivery_status: str | None = None
    last_delivery_at: datetime | None = None


class AlertDeliveryRead(BaseModel):
    id: int
    channel_id: int | None
    channel_name: str | None = None
    url_name: str | None = None
    event_type: str
    status: str
    error: str | None
    created_at: datetime


class MaintenanceWindowCreate(BaseModel):
    url_id: int
    title: str
    message: str | None = None
    starts_at: datetime
    ends_at: datetime


class MaintenanceWindowCreateList(BaseModel):
    url_ids: list[int]
    title: str
    message: str | None = None
    starts_at: datetime
    ends_at: datetime


class MaintenanceWindowRead(MaintenanceWindowCreate):
    id: int


class PublicMonitorRead(BaseModel):
    id: int
    name: str
    status: str
    uptime_90d: float
    last_checked_at: datetime | None
    open_incident: IncidentRead | None = None


class PublicStatusRead(BaseModel):
    monitors: list[PublicMonitorRead]
    maintenance_windows: list[MaintenanceWindowRead]
