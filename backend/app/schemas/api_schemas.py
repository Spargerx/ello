"""Pydantic schemas for the API."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Auth & Simulator ────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: str
    expires_in: int


class LoginRequest(BaseModel):
    user_id: str


# ── Resources ───────────────────────────────────────

class AccountResponse(BaseModel):
    account_id: str
    owner_user_id: str
    account_type: str
    balance: float
    label: str | None


class TransactionResponse(BaseModel):
    tx_id: str
    account_id: str
    amount: float
    description: str | None
    tx_type: str
    timestamp: datetime


# ── Security Events ─────────────────────────────────

class TraceStepSchema(BaseModel):
    step: str
    status: str
    detail: str


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
    details: dict[str, Any] | None


# ── Gateway Control ─────────────────────────────────

class ProtectionModeResponse(BaseModel):
    mode: str


class ProtectionModeUpdate(BaseModel):
    mode: str  # "active" or "monitor"
