"""Security event persistence service."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security_event import SecurityEvent


async def record_security_event(
    db: AsyncSession,
    *,
    request_id: str,
    source_ip: str = "127.0.0.1",
    user_id: str | None = None,
    username: str | None = None,
    method: str = "GET",
    path: str | None = None,
    resource_id: str | None = None,
    resource_owner_id: str | None = None,
    threat_type: str | None = None,
    severity: str = "MEDIUM",
    risk_score: float = 0.0,
    action: str = "BLOCKED",
    status_code: int = 403,
    reason: str | None = None,
    details: dict | None = None,
) -> SecurityEvent:
    """Create and persist a security event. Returns the created event."""
    event = SecurityEvent(
        event_id=str(uuid.uuid4()),
        request_id=request_id,
        source_ip=source_ip,
        user_id=user_id,
        username=username,
        method=method,
        path=path,
        resource_id=resource_id,
        resource_owner_id=resource_owner_id,
        threat_type=threat_type,
        severity=severity,
        risk_score=risk_score,
        action=action,
        status_code=status_code,
        reason=reason,
        details=details,
    )
    db.add(event)
    await db.flush()
    return event
