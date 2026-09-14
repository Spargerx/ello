"""Gateway middleware — the security pipeline that protects every request.

Orchestrates: JWT validation → payload scan → rate limiting →
resource extraction → BOLA check → decision → event logging.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
import json

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request

from app.config import settings
from app.gateway.jwt_validator import decode_token, extract_bearer_token
from app.gateway.bola_engine import evaluate_ownership, BolaDecision
from app.gateway.decision_engine import extract_resource, ResourceMatch
from app.gateway.payload_detector import scan_request
from app.gateway.rate_limiter import check_rate_limit, track_suspicious_attempt
from app.gateway.risk_engine import calculate_risk
from app.services.event_service import record_security_event
from app.services.websocket_manager import ws_manager
import logging

logger = logging.getLogger(__name__)


# ── Pipeline result ──────────────────────────────────

@dataclass
class TraceStep:
    step: str
    status: str  # PASS, FAIL, SKIP, BLOCK, DETECT
    detail: str


@dataclass
class GatewayResult:
    """Full result of the gateway security pipeline."""

    request_id: str
    http_status: int
    allowed: bool
    body: dict
    trace: list[TraceStep] = field(default_factory=list)
    bola_decision: BolaDecision | None = None
    resource_match: ResourceMatch | None = None
    threat_type: str | None = None
    risk_score: float = 0.0
    severity: str = "NONE"
    user_id: str | None = None
    username: str | None = None
    user_role: str | None = None
    action: str = "ALLOW"
    risk_factors: list[str] = field(default_factory=list)


# ── Main pipeline ────────────────────────────────────

async def run_gateway_pipeline(
    db: AsyncSession,
    *,
    method: str,
    path: str,
    authorization: str | None = None,
    source_ip: str = "127.0.0.1",
    query_params: dict[str, str] | None = None,
    body_bytes: bytes | None = None,
) -> GatewayResult:
    """
    Run the full security pipeline for a request.

    Returns a GatewayResult with HTTP status, body, trace, and metadata.
    """
    request_id = str(uuid.uuid4())
    trace: list[TraceStep] = []
    user_id: str | None = None
    username: str | None = None
    user_role: str | None = None

    # We will track threat type to calculate unified risk later
    threat_type: str | None = None
    fail_reason: str = ""
    is_cross_user: bool = False
    repeated_attempts: int = 0
    http_status: int = 200

    # ── 1. JWT validation ────────────────────────────
    token = extract_bearer_token(authorization)
    if token is None:
        trace.append(TraceStep("JWT_VALIDATION", "FAIL", "No Bearer token provided"))
        threat_type = "AUTH_FAILURE"
        fail_reason = "Authentication required"
        http_status = 401
    else:
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
            user_role = payload.get("role", "user")
            username = payload.get("username", "")
            trace.append(
                TraceStep(
                    "JWT_VALIDATION",
                    "PASS",
                    f"Authenticated as {user_id} (role={user_role})",
                )
            )
        except Exception as exc:
            trace.append(TraceStep("JWT_VALIDATION", "FAIL", str(exc)))
            threat_type = "AUTH_FAILURE"
            fail_reason = "Invalid or expired token"
            http_status = 401

    # ── 2. Payload scan ──────────────────────────────
    if not threat_type:
        is_malicious, pattern = scan_request(path, query_params, body_bytes)
        if is_malicious:
            trace.append(
                TraceStep("PAYLOAD_SCAN", "FAIL", f"SQL injection detected: {pattern}")
            )
            threat_type = "SQL_INJECTION"
            fail_reason = "Malicious payload detected"
            http_status = 403
            repeated_attempts = await track_suspicious_attempt(user_id)
        else:
            trace.append(TraceStep("PAYLOAD_SCAN", "PASS", "No malicious patterns"))

    # ── 3. Rate limiting ─────────────────────────────
    if not threat_type and user_id:
        is_limited, count = await check_rate_limit(user_id)
        if is_limited:
            trace.append(
                TraceStep(
                    "RATE_LIMIT",
                    "FAIL",
                    f"Exceeded {settings.RATE_LIMIT_RPM} rpm (current: {count})",
                )
            )
            threat_type = "RATE_LIMIT"
            fail_reason = "Rate limit exceeded"
            http_status = 429
            repeated_attempts = await track_suspicious_attempt(user_id)
        else:
            trace.append(
                TraceStep("RATE_LIMIT", "PASS", f"{count}/{settings.RATE_LIMIT_RPM} rpm")
            )

    # ── 4. Resource extraction ───────────────────────
    resource = extract_resource(path)
    if resource and not threat_type:
        trace.append(
            TraceStep(
                "RESOURCE_EXTRACTION",
                "PASS",
                f"{resource.resource_type}:{resource.resource_id} via {resource.route_name}",
            )
        )
    elif not resource and not threat_type:
        trace.append(
            TraceStep("RESOURCE_EXTRACTION", "SKIP", "Not a resource-bound path")
        )

    # ── 5. BOLA check ────────────────────────────────
    bola_decision = None
    if resource and user_id and not threat_type:
        bola_decision = await evaluate_ownership(
            db,
            user_id=user_id,
            user_role=user_role,
            resource_type=resource.resource_type,
            resource_id=resource.resource_id,
        )

        if bola_decision.authorization_result != "ALLOWED":
            trace.append(TraceStep("BOLA_CHECK", "FAIL", bola_decision.reason))
            threat_type = bola_decision.threat_type
            fail_reason = bola_decision.reason
            http_status = 404 if bola_decision.authorization_result == "NO_RESOURCE" else 403
            if bola_decision.resource_owner_id and bola_decision.resource_owner_id != user_id:
                is_cross_user = True
            
            if threat_type:
                repeated_attempts = await track_suspicious_attempt(user_id)
        else:
            trace.append(TraceStep("BOLA_CHECK", "PASS", bola_decision.reason))

    # ── 6. Risk Calculation ──────────────────────────
    resource_type = resource.resource_type if resource else None
    risk_score, severity, risk_factors = calculate_risk(
        threat_type=threat_type,
        resource_type=resource_type,
        is_cross_user=is_cross_user,
        repeated_attempts=repeated_attempts
    )
    
    if risk_factors:
        trace.append(TraceStep("RISK_ASSESSMENT", "PASS", f"Score {risk_score:.0f}: {', '.join(risk_factors)}"))
    else:
        trace.append(TraceStep("RISK_ASSESSMENT", "PASS", "No threat detected"))

    # ── 7. Decision & Action ─────────────────────────
    action = "ALLOW"
    allowed = True

    if threat_type:
        if settings.PROTECTION_MODE == "active":
            action = "BLOCK"
            allowed = False
            trace.append(TraceStep("ACTION", "BLOCK", f"HTTP {http_status} (Mode: ENFORCING)"))
        else:
            action = "DETECT"
            allowed = True
            trace.append(TraceStep("ACTION", "DETECT", f"Threat logged but allowed (Mode: DETECTION_ONLY)"))
            http_status = 200 # Let it through
    elif bola_decision and bola_decision.authorization_result == "NO_RESOURCE":
        action = "BLOCK"
        allowed = False
        trace.append(TraceStep("ACTION", "BLOCK", f"HTTP {http_status} (Resource Not Found)"))
    else:
        trace.append(TraceStep("ACTION", "ALLOW", "HTTP 200"))
        http_status = 200

    result = GatewayResult(
        request_id=request_id,
        http_status=http_status,
        allowed=allowed,
        body={"detail": fail_reason} if fail_reason and not allowed else {},
        trace=trace,
        bola_decision=bola_decision,
        resource_match=resource,
        threat_type=threat_type,
        risk_score=risk_score,
        severity=severity,
        user_id=user_id,
        username=username,
        user_role=user_role,
        action=action,
        risk_factors=risk_factors
    )

    # ── 8. Telemetry Logging ─────────────────────────
    # We do NOT want event logging failure to accidentally make a blocked request allowed.
    # Therefore, if the DB fails here, it throws 500, which is still a block (fail-closed).
    # But if WS fails, we don't want to crash. `ws_manager` suppresses exceptions internally mostly, 
    # but we'll try-except the WS broadcast explicitly just in case.
    await _log_event(db, result, method, path, source_ip)
    
    return result


# ── Event logging helper ─────────────────────────────

async def _log_event(
    db: AsyncSession,
    result: GatewayResult,
    method: str,
    path: str,
    source_ip: str,
):
    """Persist a security event and broadcast it via WebSocket."""
    # Ensure database persistence (authoritative decision)
    threat_type = result.threat_type or (
        "ACCESS_GRANTED" if result.action == "ALLOW" else "UNKNOWN"
    )
    severity = result.severity if result.severity != "NONE" else "INFO"
    resource_id = result.resource_match.resource_id if result.resource_match else None
    resource_owner = (
        result.bola_decision.resource_owner_id if result.bola_decision else None
    )

    event = await record_security_event(
        db,
        request_id=result.request_id,
        source_ip=source_ip,
        user_id=result.user_id,
        username=result.username,
        method=method,
        path=path,
        resource_id=resource_id,
        resource_owner_id=resource_owner,
        threat_type=threat_type,
        severity=severity,
        risk_score=result.risk_score,
        action=result.action,
        status_code=result.http_status,
        reason=result.body.get("detail", ""),
        details={
            "trace": [
                {"step": s.step, "status": s.status, "detail": s.detail}
                for s in result.trace
            ],
            "risk_factors": result.risk_factors
        },
    )

    # Broadcast over WebSocket (non-authoritative, fire-and-forget style if possible)
    try:
        await ws_manager.broadcast_event(
            {
                "type": "security_event",
                "data": {
                    "event_id": event.event_id,
                    "request_id": event.request_id,
                    "timestamp": event.timestamp.isoformat()
                    if event.timestamp
                    else datetime.now(timezone.utc).isoformat(),
                    "source_ip": event.source_ip,
                    "user_id": event.user_id,
                    "username": event.username,
                    "method": event.method,
                    "path": event.path,
                    "resource_id": event.resource_id,
                    "resource_owner_id": event.resource_owner_id,
                    "threat_type": event.threat_type,
                    "severity": event.severity,
                    "risk_score": event.risk_score,
                    "action": event.action,
                    "status_code": event.status_code,
                    "reason": event.reason,
                    "details": event.details
                },
            }
        )
    except Exception as e:
        logger.error(f"WebSocket broadcast failed for event {event.event_id}: {e}")
        # We intentionally swallow the exception here so the security decision remains authoritative 
        # and doesn't 500 when it's supposed to return 403 or 200.
