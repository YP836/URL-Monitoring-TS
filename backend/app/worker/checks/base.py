from dataclasses import dataclass
from typing import Any


@dataclass
class CheckResult:
    url_id: int
    check_type: str
    status: str
    latency_ms: int | None
    extra_data: dict[str, Any]
    checked_at: str
