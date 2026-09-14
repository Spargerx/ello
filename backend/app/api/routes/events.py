"""Events and Traffic routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.database import get_db
from app.models.security_event import SecurityEvent
from app.schemas.api_contract import EventListResponse

router = APIRouter()

def _format_event(event: SecurityEvent) -> dict:
    trace = []
    if event.details and isinstance(event.details, dict):
        trace = event.details.get("trace", [])
        
    return {
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


@router.get("/events", response_model=EventListResponse)
async def get_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: Optional[str] = None,
    threat_type: Optional[str] = None,
    severity: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List security events with optional filtering.
    """
    query = select(SecurityEvent)
    
    if action:
        query = query.where(SecurityEvent.action == action)
    if threat_type:
        query = query.where(SecurityEvent.threat_type == threat_type)
    if severity:
        query = query.where(SecurityEvent.severity == severity)
    if user_id:
        query = query.where(SecurityEvent.user_id == user_id)
        
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    
    # Paginate
    query = query.order_by(desc(SecurityEvent.timestamp))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    events = result.scalars().all()
    
    formatted_events = [_format_event(e) for e in events]
    
    return EventListResponse(
        items=formatted_events,
        page=page,
        page_size=page_size,
        total=total
    )


@router.get("/events/{event_id}")
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get a single event by its ID.
    """
    result = await db.execute(select(SecurityEvent).where(SecurityEvent.event_id == event_id))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    return _format_event(event)


@router.get("/traffic", response_model=EventListResponse)
async def get_traffic(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    method: Optional[str] = None,
    status_code: Optional[int] = None,
    action: Optional[str] = None,
    threat_type: Optional[str] = None,
    user_id: Optional[str] = None,
    path: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List all traffic. Since the gateway logs every request as a SecurityEvent,
    we can derive the full traffic log directly from the events table.
    """
    query = select(SecurityEvent)
    
    if method:
        query = query.where(SecurityEvent.method == method)
    if status_code is not None:
        query = query.where(SecurityEvent.status_code == status_code)
    if action:
        query = query.where(SecurityEvent.action == action)
    if threat_type:
        query = query.where(SecurityEvent.threat_type == threat_type)
    if user_id:
        query = query.where(SecurityEvent.user_id == user_id)
    if path:
        query = query.where(SecurityEvent.path.ilike(f"%{path}%"))
        
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    
    query = query.order_by(desc(SecurityEvent.timestamp))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    events = result.scalars().all()
    
    formatted_events = [_format_event(e) for e in events]
    
    return EventListResponse(
        items=formatted_events,
        page=page,
        page_size=page_size,
        total=total
    )
