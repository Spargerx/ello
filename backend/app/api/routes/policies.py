"""Security policies read-only endpoint."""

from fastapi import APIRouter
from app.config import settings
from app.schemas.api_contract import PolicyResponse

router = APIRouter()

@router.get("/policies", response_model=PolicyResponse)
async def get_policies():
    """
    Return the current active protection policies.
    """
    return {
        "protection_mode": settings.PROTECTION_MODE,
        "bola": {
            "enabled": True
        },
        "ownership_validation": {
            "enabled": True  # Logical mapping for dashboard
        },
        "rate_limiting": {
            "enabled": True,
            "requests": settings.RATE_LIMIT_RPM,
            "window_seconds": 60
        },
        "payload_detection": {
            "enabled": True
        },
        "audit_logging": {
            "enabled": True  # Always enabled in our architecture
        },
        "websocket_telemetry": {
            "enabled": True  # Always enabled in our architecture
        }
    }
