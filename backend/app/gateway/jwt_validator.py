"""JWT validation and token creation.

Reads secret/algorithm from environment via config — nothing hardcoded.
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.config import settings


def create_token(user_id: str, role: str = "user", username: str = "") -> dict:
    """Create a signed JWT for a given user."""
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=settings.JWT_EXPIRY_HOURS)

    payload = {
        "sub": user_id,
        "role": role,
        "username": username,
        "iat": now,
        "exp": expires,
        "iss": "ello",
    }

    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
        "role": role,
        "expires_in": int(settings.JWT_EXPIRY_HOURS * 3600),
    }


def decode_token(token: str) -> dict:
    """Validate signature, expiry, and algorithm. Returns decoded payload."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require_sub": True, "require_exp": True},
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def extract_bearer_token(authorization: str | None) -> str | None:
    """Pull Bearer token from Authorization header value."""
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None
