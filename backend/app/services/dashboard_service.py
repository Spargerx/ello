"""Dashboard statistics service — queries real data from security_events."""

import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, desc, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security_event import SecurityEvent


# Simple in-memory counter for total request throughput
class _RequestCounter:
    def __init__(self):
        self.total = 0
        self.start_time = time.time()

    def tick(self):
        self.total += 1


request_counter = _RequestCounter()


async def get_dashboard_stats(db: AsyncSession) -> dict:
    """Aggregate real-time stats from the security_events table."""
    blocked = (
        await db.execute(
            select(func.count()).where(SecurityEvent.action == "BLOCKED")
        )
    ).scalar() or 0

    allowed = (
        await db.execute(
            select(func.count()).where(SecurityEvent.action == "ALLOWED")
        )
    ).scalar() or 0

    threats = (
        await db.execute(
            select(func.count()).where(
                SecurityEvent.threat_type.in_(
                    ["BOLA", "SQL_INJECTION", "RATE_LIMIT", "AUTH_FAILURE"]
                )
            )
        )
    ).scalar() or 0

    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    events_last_hour = (
        await db.execute(
            select(func.count()).where(SecurityEvent.timestamp >= one_hour_ago)
        )
    ).scalar() or 0

    avg_risk = (
        await db.execute(
            select(func.avg(SecurityEvent.risk_score)).where(
                SecurityEvent.risk_score > 0
            )
        )
    ).scalar() or 0.0

    top_type_row = (
        await db.execute(
            select(SecurityEvent.threat_type, func.count().label("cnt"))
            .where(
                SecurityEvent.threat_type.in_(
                    ["BOLA", "SQL_INJECTION", "RATE_LIMIT"]
                )
            )
            .group_by(SecurityEvent.threat_type)
            .order_by(desc("cnt"))
            .limit(1)
        )
    ).first()
    top_threat = top_type_row[0] if top_type_row else None

    return {
        "total_requests": request_counter.total,
        "threats_blocked": blocked,
        "threats_detected": threats,
        "requests_allowed": allowed,
        "risk_score": round(float(avg_risk), 2),
        "protection_mode": "active",
        "uptime_seconds": round(time.time() - request_counter.start_time, 1),
        "events_last_hour": events_last_hour,
        "top_threat_type": top_threat,
    }
