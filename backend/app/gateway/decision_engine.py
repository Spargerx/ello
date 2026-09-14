"""Resource extraction — maps URL paths to (resource_type, resource_id).

Uses a table of route definitions rather than a single fragile regex.
New resource types can be added by appending to ROUTE_DEFINITIONS.
"""

from dataclasses import dataclass
import re


@dataclass
class ResourceMatch:
    """Result of matching a request path to a known resource."""

    resource_type: str
    resource_id: str
    route_name: str


@dataclass
class RouteDefinition:
    """A registered route pattern with its resource semantics."""

    pattern: re.Pattern
    resource_type: str
    id_group: int  # which regex group holds the resource ID
    name: str


# ── Route definitions ────────────────────────────────
# Order matters — first match wins. More specific patterns first.

ROUTE_DEFINITIONS: list[RouteDefinition] = [
    RouteDefinition(
        pattern=re.compile(r"^/api/accounts/([A-Za-z0-9_]+)/transactions$"),
        resource_type="account",
        id_group=1,
        name="account_transactions",
    ),
    RouteDefinition(
        pattern=re.compile(r"^/api/accounts/([A-Za-z0-9_]+)$"),
        resource_type="account",
        id_group=1,
        name="account_detail",
    ),
    RouteDefinition(
        pattern=re.compile(r"^/api/transactions/([A-Za-z0-9_]+)$"),
        resource_type="transaction",
        id_group=1,
        name="transaction_detail",
    ),
]


def extract_resource(path: str) -> ResourceMatch | None:
    """
    Match a request path against known route definitions.

    Returns a ResourceMatch if the path targets a specific resource,
    or None if the path is not resource-bound (e.g. /health).
    """
    for route_def in ROUTE_DEFINITIONS:
        match = route_def.pattern.match(path)
        if match:
            return ResourceMatch(
                resource_type=route_def.resource_type,
                resource_id=match.group(route_def.id_group),
                route_name=route_def.name,
            )
    return None
