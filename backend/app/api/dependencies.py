"""API router dependencies and common utilities."""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.gateway.middleware import run_gateway_pipeline, GatewayResult


async def verify_gateway(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> GatewayResult:
    """
    FastAPI dependency that runs the gateway pipeline.
    If the gateway blocks the request, this raises an HTTPException immediately.
    """
    authorization = request.headers.get("Authorization")
    client_ip = request.client.host if request.client else "127.0.0.1"

    query_params = dict(request.query_params)
    
    body_bytes = None
    if request.method in ("POST", "PUT", "PATCH"):
        # FastAPI caches the body once read, so downstream routes can still read it
        body_bytes = await request.body()

    # Run the gateway pipeline
    result = await run_gateway_pipeline(
        db,
        method=request.method,
        path=request.url.path,
        authorization=authorization,
        source_ip=client_ip,
        query_params=query_params,
        body_bytes=body_bytes
    )

    if not result.allowed:
        # Request blocked by gateway — halt FastAPI execution
        raise HTTPException(
            status_code=result.http_status,
            detail=result.body.get("detail", "Access Denied"),
        )

    # Allow request to proceed to the business endpoint
    return result
