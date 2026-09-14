"""Auth and Simulator routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.gateway.jwt_validator import create_token
from app.gateway.middleware import run_gateway_pipeline
from app.models.user import User
from app.schemas.api_schemas import LoginRequest, TokenResponse
from app.schemas.api_contract import SimulatorBolaRequest, SimulatorBolaResponse, HealthResponse
from app.config import settings
import uuid

router = APIRouter()


@router.post("/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Demo login: No password required, just user_id.
    Returns a valid JWT for the simulator.
    """
    result = await db.execute(select(User).where(User.user_id == req.user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found in demo database")

    return create_token(user_id=user.user_id, role=user.role, username=user.username)


@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health endpoint, verifying DB connection."""
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return HealthResponse(status="ok", database=db_status, service="ello gateway")


@router.post("/api/simulator/bola", response_model=SimulatorBolaResponse)
async def simulate_bola(req: SimulatorBolaRequest, db: AsyncSession = Depends(get_db)):
    """
    Trigger the real gateway BOLA detection logic deterministically.
    """
    # Create an attacker token
    result = await db.execute(select(User).where(User.user_id == req.attacker_user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Attacker not found")

    token = create_token(user_id=user.user_id, role=user.role, username=user.username)["access_token"]
    authorization = f"Bearer {token}"
    
    # Define the target path
    path = f"/api/accounts/{req.target_resource_id}"
    
    # Temporarily override settings if requested (safe for synchronous-like demo flow, 
    # but not thread-safe. We do this carefully for the hackathon prototype.)
    original_mode = settings.PROTECTION_MODE
    settings.PROTECTION_MODE = "active" if req.protection_mode == "ENFORCING" else "monitor"
    
    try:
        gateway_res = await run_gateway_pipeline(
            db=db,
            method="GET",
            path=path,
            authorization=authorization,
            source_ip="127.0.0.1"
        )
    finally:
        # Restore
        settings.PROTECTION_MODE = original_mode

    trace = [{"step": s.step, "status": s.status, "detail": s.detail} for s in gateway_res.trace]
    
    return SimulatorBolaResponse(
        request_id=gateway_res.request_id,
        success=gateway_res.allowed,
        status_code=gateway_res.http_status,
        action=gateway_res.action,
        threat_type=gateway_res.threat_type,
        severity=gateway_res.severity,
        risk_score=gateway_res.risk_score,
        response_data=gateway_res.body if gateway_res.body else {"account_data": "secret_data"} if gateway_res.allowed else None,
        decision_trace=trace
    )
