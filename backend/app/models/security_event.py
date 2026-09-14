"""Security event model — every gateway decision is logged here."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.db.database import Base


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, autoincrement=True)

    event_id = Column(
        String(50),
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    request_id = Column(
        String(50),
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Request context
    source_ip = Column(String(50), default="127.0.0.1")
    user_id = Column(String(50), nullable=True, index=True)
    username = Column(String(100), nullable=True)
    method = Column(String(10), default="GET")
    path = Column(String(500), nullable=True)

    # Resource context
    resource_id = Column(String(100), nullable=True)
    resource_owner_id = Column(String(50), nullable=True)

    # Threat assessment
    threat_type = Column(String(100), nullable=True, index=True)
    severity = Column(String(20), nullable=False, default="MEDIUM")
    risk_score = Column(Float, nullable=False, default=0.0)

    # Decision
    action = Column(String(50), nullable=False, default="BLOCKED")
    status_code = Column(Integer, nullable=False, default=403)
    reason = Column(Text, nullable=True)
    details = Column(JSONB, nullable=True)

    resolved = Column(Boolean, nullable=False, default=False)
