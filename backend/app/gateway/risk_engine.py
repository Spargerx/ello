"""Risk scoring engine.

Calculates a deterministic risk score and severity based on threat factors.
"""

from typing import Tuple

def calculate_risk(
    threat_type: str | None,
    resource_type: str | None = None,
    is_cross_user: bool = False,
    repeated_attempts: int = 0
) -> Tuple[float, str, list[str]]:
    """
    Calculate deterministic risk score and severity.
    Returns (risk_score, severity, risk_factors).
    """
    if not threat_type:
        return 0.0, "NONE", []

    score = 0
    factors = []

    if threat_type == "BOLA":
        score += 50
        factors.append("BOLA detected (+50)")
        if is_cross_user:
            score += 20
            factors.append("Cross-user resource access (+20)")
    elif threat_type == "SQL_INJECTION":
        score += 70
        factors.append("SQL Injection detected (+70)")
    elif threat_type == "RATE_LIMIT":
        score += 40
        factors.append("Rate limit exceeded (+40)")

    if resource_type in ("account", "transaction", "payment"):
        score += 20
        factors.append("Sensitive endpoint (+20)")

    if repeated_attempts > 0:
        penalty = min(repeated_attempts * 10, 30)
        score += penalty
        factors.append(f"Repeated suspicious attempt (+{penalty})")

    score = min(score, 100)
    score_float = float(score)

    if score < 30:
        severity = "LOW"
    elif score < 60:
        severity = "MEDIUM"
    elif score < 80:
        severity = "HIGH"
    else:
        severity = "CRITICAL"

    return score_float, severity, factors
