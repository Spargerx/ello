"""Basic payload scanner for SQL injection patterns.

Lightweight heuristic — not a WAF replacement, but demonstrates
the security pipeline for the hackathon prototype.
"""

import re
import json

_SQLI_PATTERNS: list[re.Pattern] = [
    re.compile(r"('|\")\s*(or|and)\s+\d+\s*=\s*\d+", re.IGNORECASE),
    re.compile(r"union\s+select", re.IGNORECASE),
    re.compile(r";\s*(drop|delete|insert|update)\s+(table|database|into|from)", re.IGNORECASE),
    re.compile(r"--\s*$", re.IGNORECASE),
    re.compile(r"/\*.*\*/", re.IGNORECASE),
]

_CMDI_PATTERNS: list[re.Pattern] = [
    re.compile(r";\s*(ls|cat|rm|wget|curl|nc|bash|sh|ping)\b", re.IGNORECASE),
    re.compile(r"\|\s*(ls|cat|rm|wget|curl|nc|bash|sh|ping)\b", re.IGNORECASE),
]

_ALL_PATTERNS = _SQLI_PATTERNS + _CMDI_PATTERNS

def scan_value(value: str) -> tuple[bool, str | None]:
    """
    Scan a string for malicious patterns.
    Returns (is_malicious, matched_pattern_description).
    """
    for pattern in _ALL_PATTERNS:
        if pattern.search(value):
            return True, pattern.pattern
    return False, None


def _scan_dict(data: dict) -> tuple[bool, str | None]:
    """Recursively scan a dictionary for malicious patterns in its string values."""
    for key, value in data.items():
        if isinstance(value, str):
            found, pattern = scan_value(value)
            if found:
                return True, pattern
        elif isinstance(value, dict):
            found, pattern = _scan_dict(value)
            if found:
                return True, pattern
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, str):
                    found, pattern = scan_value(item)
                    if found:
                        return True, pattern
                elif isinstance(item, dict):
                    found, pattern = _scan_dict(item)
                    if found:
                        return True, pattern
    return False, None


def scan_request(
    path: str,
    query_params: dict[str, str] | None = None,
    body_bytes: bytes | None = None,
) -> tuple[bool, str | None]:
    """
    Scan a full request (path + query params + json body) for malicious payloads.
    Returns (is_malicious, matched_pattern_description).
    """
    # Check path
    found, pattern = scan_value(path)
    if found:
        return True, pattern

    # Check query params
    if query_params:
        for value in query_params.values():
            found, pattern = scan_value(str(value))
            if found:
                return True, pattern

    # Check JSON body
    if body_bytes:
        try:
            body_text = body_bytes.decode("utf-8")
            body_json = json.loads(body_text)
            if isinstance(body_json, dict):
                found, pattern = _scan_dict(body_json)
                if found:
                    return True, pattern
            elif isinstance(body_json, list):
                for item in body_json:
                    if isinstance(item, dict):
                        found, pattern = _scan_dict(item)
                        if found:
                            return True, pattern
                    elif isinstance(item, str):
                        found, pattern = scan_value(item)
                        if found:
                            return True, pattern
        except Exception:
            pass # Ignore non-JSON bodies or decoding errors for now

    return False, None
