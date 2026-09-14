"""BOLA detection engine.

Performs contextual ownership verification by looking up who owns a
resource in the database and comparing against the authenticated user.

Does NOT rely on fragile URL regex. Instead, callers pass structured
(resource_type, resource_id) tuples and the engine resolves ownership
through a registry of lookup functions — easily extensible to new
resource types.
"""

from dataclasses import dataclass
from typing import Callable, Awaitable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.transaction import Transaction


# ── Decision dataclass ───────────────────────────────

@dataclass
class BolaDecision:
    """Structured result of a BOLA evaluation."""

    authenticated: bool
    user_id: str | None
    user_role: str | None
    resource_id: str | None
    resource_owner_id: str | None
    authorization_result: str  # "ALLOWED", "DENIED", "NO_RESOURCE"
    threat_type: str | None  # "BOLA", None
    reason: str


# ── Ownership lookup registry ────────────────────────

# Each lookup function: (db, resource_id) -> (owner_user_id | None, exists: bool)
OwnershipLookup = Callable[[AsyncSession, str], Awaitable[tuple[str | None, bool]]]

_ownership_registry: dict[str, OwnershipLookup] = {}


def register_resource(resource_type: str, lookup: OwnershipLookup):
    """Register an ownership lookup for a resource type."""
    _ownership_registry[resource_type] = lookup


async def _lookup_account_owner(db: AsyncSession, resource_id: str) -> tuple[str | None, bool]:
    result = await db.execute(
        select(Account.owner_user_id).where(Account.account_id == resource_id)
    )
    row = result.first()
    if row:
        return row[0], True
    return None, False


async def _lookup_transaction_owner(db: AsyncSession, resource_id: str) -> tuple[str | None, bool]:
    """Transaction ownership = owner of the account the transaction belongs to."""
    result = await db.execute(
        select(Account.owner_user_id)
        .join(Transaction, Transaction.account_id == Account.account_id)
        .where(Transaction.tx_id == resource_id)
    )
    row = result.first()
    if row:
        return row[0], True
    return None, False


# Register built-in resource types
register_resource("account", _lookup_account_owner)
register_resource("transaction", _lookup_transaction_owner)


# ── Core evaluation ──────────────────────────────────

async def evaluate_ownership(
    db: AsyncSession,
    *,
    user_id: str,
    user_role: str,
    resource_type: str,
    resource_id: str,
) -> BolaDecision:
    """
    Core BOLA check: does the authenticated user own the requested resource?

    Admin role bypasses ownership checks.
    """
    # 1. Find the lookup function for this resource type
    lookup = _ownership_registry.get(resource_type)
    if lookup is None:
        return BolaDecision(
            authenticated=True,
            user_id=user_id,
            user_role=user_role,
            resource_id=resource_id,
            resource_owner_id=None,
            authorization_result="NO_RESOURCE",
            threat_type=None,
            reason=f"Unknown resource type: {resource_type}",
        )

    # 2. Look up ownership
    owner_id, exists = await lookup(db, resource_id)

    if not exists:
        return BolaDecision(
            authenticated=True,
            user_id=user_id,
            user_role=user_role,
            resource_id=resource_id,
            resource_owner_id=None,
            authorization_result="NO_RESOURCE",
            threat_type=None,
            reason=f"Resource {resource_id} not found",
        )

    # 3. Admin bypass
    if user_role == "admin":
        return BolaDecision(
            authenticated=True,
            user_id=user_id,
            user_role=user_role,
            resource_id=resource_id,
            resource_owner_id=owner_id,
            authorization_result="ALLOWED",
            threat_type=None,
            reason=f"Admin role bypass — resource owned by {owner_id}",
        )

    # 4. Ownership check
    if user_id == owner_id:
        return BolaDecision(
            authenticated=True,
            user_id=user_id,
            user_role=user_role,
            resource_id=resource_id,
            resource_owner_id=owner_id,
            authorization_result="ALLOWED",
            threat_type=None,
            reason=f"Owner match: {user_id} owns {resource_id}",
        )

    # 5. BOLA detected
    return BolaDecision(
        authenticated=True,
        user_id=user_id,
        user_role=user_role,
        resource_id=resource_id,
        resource_owner_id=owner_id,
        authorization_result="DENIED",
        threat_type="BOLA",
        reason=(
            f"BOLA: user {user_id} attempted to access {resource_id} "
            f"owned by {owner_id}"
        ),
    )
