"""Standardized API schemas for the frontend integration contract."""

from typing import Any
from datetime import datetime
from pydantic import BaseModel, Field

# ── Enums (Logical constants) ──────────────────────────────────

class ThreatType:
    BOLA = "BOLA"
    RATE_LIMIT = "RATE_LIMIT"
    SQL_INJECTION = "SQL_INJECTION"
    COMMAND_INJECTION = "COMMAND_INJECTION"
    OTHER = "OTHER"

class ActionType:
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    DETECT = "DETECT"

class ProtectionMode:
    ENFORCING = "ENFORCING"
    DETECTION_ONLY = "DETECTION_ONLY"

class Severity:
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    INFO = "INFO"


# ── Security Event & Traffic ────────────────────────────────────

class SecurityEventResponse(BaseModel):
    event_id: str
    request_id: str
    timestamp: datetime
    source_ip: str
    user_id: str | None
    username: str | None
    method: str
    path: str
    resource_id: str | None
    resource_owner_id: str | None
    threat_type: str | None
    severity: str
    risk_score: float
    action: str
    status_code: int
    reason: str | None
    details: dict | None
    decision_trace: list[dict] | None = None

    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    items: list[SecurityEventResponse]
    page: int
    page_size: int
    total: int


# ── Dashboard ───────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_requests: int
    blocked_requests: int
    threat_count: int
    high_risk_count: int
    bola_count: int
    request_rate: float


class DashboardResponse(BaseModel):
    stats: DashboardStats
    timeline: list[dict]
    threat_distribution: list[dict]
    endpoint_threats: list[dict]
    recent_events: list[SecurityEventResponse]


class AnalyticsResponse(BaseModel):
    traffic: dict
    threats: list[dict]
    severity: list[dict]
    top_endpoints: list[dict]
    top_users: list[dict]


# ── Policies ────────────────────────────────────────────────────

class PolicyConfigItem(BaseModel):
    enabled: bool

class RateLimitPolicyItem(PolicyConfigItem):
    requests: int
    window_seconds: int

class PolicyResponse(BaseModel):
    protection_mode: str
    bola: PolicyConfigItem
    ownership_validation: PolicyConfigItem
    rate_limiting: RateLimitPolicyItem
    payload_detection: PolicyConfigItem
    audit_logging: PolicyConfigItem
    websocket_telemetry: PolicyConfigItem


# ── Simulator ───────────────────────────────────────────────────

class SimulatorBolaRequest(BaseModel):
    attacker_user_id: str
    target_resource_id: str
    protection_mode: str = "ENFORCING"


class SimulatorBolaResponse(BaseModel):
    request_id: str
    success: bool
    status_code: int
    action: str
    threat_type: str | None
    severity: str
    risk_score: float
    response_data: dict | None
    decision_trace: list[dict]


# ── Health ──────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    database: str
    service: str
