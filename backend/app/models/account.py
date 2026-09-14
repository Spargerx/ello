"""Account model — the primary BOLA-protected resource."""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.db.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(String(50), unique=True, nullable=False, index=True)
    owner_user_id = Column(
        String(50), ForeignKey("users.user_id"), nullable=False, index=True
    )
    account_type = Column(String(50), nullable=False, default="checking")
    balance = Column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    label = Column(String(200), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", back_populates="accounts", lazy="selectin")
    transactions = relationship("Transaction", back_populates="account", lazy="selectin")
