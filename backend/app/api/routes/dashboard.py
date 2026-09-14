"""Dashboard statistics and aggregations."""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, text, desc
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from datetime import datetime, timedelta, timezone

from app.db.database import get_db
from app.models.security_event import SecurityEvent
from app.schemas.api_contract import DashboardResponse, DashboardStats, AnalyticsResponse

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    """
    Return backend-derived dashboard data.
    """
    # Stats
    total_result = await db.execute(select(func.count(SecurityEvent.id)))
    total_requests = total_result.scalar_one_or_none() or 0

    blocked_result = await db.execute(
        select(func.count(SecurityEvent.id))
        .where(SecurityEvent.action == "BLOCK")
    )
    blocked_requests = blocked_result.scalar_one_or_none() or 0

    threat_result = await db.execute(
        select(func.count(SecurityEvent.id))
        .where(SecurityEvent.threat_type.notin_(["ACCESS_GRANTED", "UNKNOWN", None]))
    )
    threat_count = threat_result.scalar_one_or_none() or 0

    high_risk_result = await db.execute(
        select(func.count(SecurityEvent.id))
        .where(SecurityEvent.severity.in_(["HIGH", "CRITICAL"]))
    )
    high_risk_count = high_risk_result.scalar_one_or_none() or 0

    bola_result = await db.execute(
        select(func.count(SecurityEvent.id))
        .where(SecurityEvent.threat_type == "BOLA")
    )
    bola_count = bola_result.scalar_one_or_none() or 0

    # Request rate (requests in last 5 minutes / 5)
    # Using raw SQL for simplicity across postgres variants if needed, or SQLAlchemy func.now()
    rate_query = text(
        "SELECT COUNT(*) FROM security_events WHERE timestamp >= (CURRENT_TIMESTAMP - INTERVAL '5 minutes')"
    )
    rate_result = await db.execute(rate_query)
    recent_5m = rate_result.scalar_one_or_none() or 0
    request_rate = round(recent_5m / 5.0, 2)

    stats = DashboardStats(
        total_requests=total_requests,
        blocked_requests=blocked_requests,
        threat_count=threat_count,
        high_risk_count=high_risk_count,
        bola_count=bola_count,
        request_rate=request_rate
    )

    # Timeline (mocking the shape with basic DB aggregation if possible, or empty if too complex)
    # Let's do a simple count by minute for the last 60 minutes
    timeline_query = text("""
        SELECT date_trunc('minute', timestamp) AS minute, COUNT(*) as count 
        FROM security_events 
        WHERE timestamp >= (CURRENT_TIMESTAMP - INTERVAL '60 minutes')
        GROUP BY minute 
        ORDER BY minute ASC
    """)
    timeline_result = await db.execute(timeline_query)
    raw_counts = {row[0]: row[1] for row in timeline_result.fetchall()}
    
    now_min = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    counts_by_ts = {
        (k.timestamp() if k.tzinfo else k.replace(tzinfo=timezone.utc).timestamp()): v 
        for k, v in raw_counts.items()
    }
    
    timeline = []
    for i in range(60, -1, -1):
        dt = now_min - timedelta(minutes=i)
        c = counts_by_ts.get(dt.timestamp(), 0)
        timeline.append({"time": dt.isoformat(), "count": c})

    # Threat Distribution
    dist_query = text("""
        SELECT threat_type, COUNT(*) as count 
        FROM security_events 
        WHERE threat_type NOT IN ('ACCESS_GRANTED', 'UNKNOWN') 
        AND threat_type IS NOT NULL
        GROUP BY threat_type
    """)
    dist_result = await db.execute(dist_query)
    threat_distribution = [{"name": row[0], "value": row[1]} for row in dist_result.fetchall()]

    # Endpoint Threats
    endpoint_query = text("""
        SELECT path, COUNT(*) as count 
        FROM security_events 
        WHERE threat_type NOT IN ('ACCESS_GRANTED', 'UNKNOWN') 
        AND threat_type IS NOT NULL
        GROUP BY path
        ORDER BY count DESC
        LIMIT 10
    """)
    endpoint_result = await db.execute(endpoint_query)
    endpoint_threats = [{"path": row[0], "threats": row[1]} for row in endpoint_result.fetchall()]

    # Recent Events
    recent_events_result = await db.execute(
        select(SecurityEvent)
        .order_by(desc(SecurityEvent.timestamp))
        .limit(10)
    )
    recent_events = []
    for event in recent_events_result.scalars():
        # Inject decision trace directly from details for the contract
        trace = []
        if event.details and isinstance(event.details, dict):
            trace = event.details.get("trace", [])
            
        event_dict = {
            "event_id": event.event_id,
            "request_id": event.request_id,
            "timestamp": event.timestamp,
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
            "details": event.details,
            "decision_trace": trace
        }
        recent_events.append(event_dict)

    return DashboardResponse(
        stats=stats,
        timeline=timeline,
        threat_distribution=threat_distribution,
        endpoint_threats=endpoint_threats,
        recent_events=recent_events
    )


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """
    Return backend-derived detailed analytics data.
    """
    # 1. Traffic Overview
    total_result = await db.execute(select(func.count(SecurityEvent.id)))
    total_requests = total_result.scalar_one_or_none() or 0

    blocked_result = await db.execute(
        select(func.count(SecurityEvent.id))
        .where(SecurityEvent.action == "BLOCK")
    )
    blocked_requests = blocked_result.scalar_one_or_none() or 0

    allowed_requests = total_requests - blocked_requests

    rate_query = text("SELECT COUNT(*) FROM security_events WHERE timestamp >= (CURRENT_TIMESTAMP - INTERVAL '5 minutes')")
    rate_result = await db.execute(rate_query)
    recent_5m = rate_result.scalar_one_or_none() or 0
    request_rate = round(recent_5m / 5.0, 2)

    traffic = {
        "total_requests": total_requests,
        "allowed_requests": allowed_requests,
        "blocked_requests": blocked_requests,
        "request_rate": request_rate
    }

    # 2. Threat Distribution
    dist_query = text("""
        SELECT threat_type, COUNT(*) as count 
        FROM security_events 
        WHERE threat_type NOT IN ('ACCESS_GRANTED', 'UNKNOWN') 
        AND threat_type IS NOT NULL
        GROUP BY threat_type
    """)
    dist_result = await db.execute(dist_query)
    threats = [{"name": row[0], "count": row[1]} for row in dist_result.fetchall()]

    # 3. Severity Distribution
    sev_query = text("""
        SELECT severity, COUNT(*) as count
        FROM security_events
        WHERE severity IS NOT NULL
        GROUP BY severity
    """)
    sev_result = await db.execute(sev_query)
    severity = [{"name": row[0], "count": row[1]} for row in sev_result.fetchall()]

    # 4. Top Endpoints
    endpoint_query = text("""
        SELECT path, COUNT(*) as count 
        FROM security_events 
        WHERE threat_type NOT IN ('ACCESS_GRANTED', 'UNKNOWN') 
        AND threat_type IS NOT NULL
        GROUP BY path
        ORDER BY count DESC
        LIMIT 10
    """)
    endpoint_result = await db.execute(endpoint_query)
    top_endpoints = [{"path": row[0], "threats": row[1]} for row in endpoint_result.fetchall()]

    # 5. Top Users
    user_query = text("""
        SELECT user_id, COUNT(*) as count 
        FROM security_events 
        WHERE threat_type NOT IN ('ACCESS_GRANTED', 'UNKNOWN') 
        AND threat_type IS NOT NULL
        AND user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 10
    """)
    user_result = await db.execute(user_query)
    top_users = [{"user_id": row[0], "threats": row[1]} for row in user_result.fetchall()]

    return AnalyticsResponse(
        traffic=traffic,
        threats=threats,
        severity=severity,
        top_endpoints=top_endpoints,
        top_users=top_users
    )
