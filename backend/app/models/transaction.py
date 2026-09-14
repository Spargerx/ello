"""Transaction model."""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String

from sqlalchemy.orm import relationship

from app.db.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tx_id = Column(String(50), unique=True, nullable=False, index=True)
    account_id = Column(
        String(50), ForeignKey("accounts.account_id"), nullable=False, index=True
    )
    amount = Column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    description = Column(String(500), nullable=True)
    tx_type = Column(String(50), nullable=False, default="debit")  # debit, credit

    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    account = relationship("Account", back_populates="transactions", lazy="selectin")
