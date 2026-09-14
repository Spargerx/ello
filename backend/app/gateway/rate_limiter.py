"""Rate limiter backed by Redis.

Uses a sliding-window counter per user per minute.
Gracefully degrades (no limiting) when Redis is unavailable.
"""

import time

import redis.asyncio as aioredis

from app.config import settings


_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis | None:
    """Lazy-init a Redis connection. Returns None if unavailable."""
    global _redis
    if _redis is None:
        try:
            _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await _redis.ping()
        except Exception:
            _redis = None
    return _redis


async def check_rate_limit(user_id: str) -> tuple[bool, int]:
    """
    Check whether user_id has exceeded the per-minute request limit.

    Returns (is_limited, current_count).
    If Redis is down, returns (False, 0) — fail-open.
    """
    client = await get_redis()
    if client is None:
        return False, 0

    try:
        minute_bucket = int(time.time()) // 60
        key = f"ello:rate:{user_id}:{minute_bucket}"
        count = await client.incr(key)
        if count == 1:
            await client.expire(key, 120)  # TTL a bit longer than 1 min for safety
        return count > settings.RATE_LIMIT_RPM, int(count)
    except Exception:
        return False, 0

async def track_suspicious_attempt(user_id: str) -> int:
    """
    Track repeated suspicious attempts for a user.
    Returns the number of recent suspicious attempts.
    """
    if not user_id:
        return 0
        
    client = await get_redis()
    if client is None:
        return 0

    try:
        key = f"ello:suspicious:{user_id}"
        count = await client.incr(key)
        # Keep track for 5 minutes
        if count == 1:
            await client.expire(key, 300)
        else:
            # Refresh TTL on repeated attempts
            await client.expire(key, 300)
        return int(count) - 1 # return previous attempts (0 for first attempt)
    except Exception:
        return 0
