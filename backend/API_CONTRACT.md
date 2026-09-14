# Backend API Contract

This document outlines the standard REST API and WebSocket contracts for the ello application, establishing the integration surface for Phase 4 (Frontend).

## REST Endpoints

### 1. `GET /api/dashboard`
Returns aggregated dashboard statistics, timeline data, threat distributions, and recent events.

**Response Schema (`DashboardResponse`)**:
```json
{
  "stats": {
    "total_requests": 1500,
    "blocked_requests": 34,
    "threat_count": 45,
    "high_risk_count": 12,
    "bola_count": 8,
    "request_rate": 15.5
  },
  "timeline": [{"time": "2024-03-24T10:00:00Z", "count": 120}, ...],
  "threat_distribution": [{"name": "BOLA", "value": 8}, ...],
  "endpoint_threats": [{"path": "/api/accounts/ACC002", "threats": 5}, ...],
  "recent_events": [ <SecurityEventResponse> ]
}
```

### 2. `GET /api/events` and `GET /api/traffic`
Returns paginated security events or traffic logs.

**Query Parameters**:
- `page` (int, default=1)
- `page_size` (int, default=20)
- `action` (string, optional)
- `threat_type` (string, optional)
- `severity` (string, optional)
- `user_id` (string, optional)

**Response Schema (`EventListResponse`)**:
```json
{
  "items": [ <SecurityEventResponse> ],
  "page": 1,
  "page_size": 20,
  "total": 100
}
```

### 3. `GET /api/events/{event_id}`
Returns a single detailed security event.

**Response Schema (`SecurityEventResponse`)**:
```json
{
  "event_id": "uuid",
  "request_id": "uuid",
  "timestamp": "2024-03-24T10:00:00Z",
  "source_ip": "127.0.0.1",
  "user_id": "U001",
  "username": "Alice",
  "method": "GET",
  "path": "/api/accounts/ACC002",
  "resource_id": "ACC002",
  "resource_owner_id": "U002",
  "threat_type": "BOLA",
  "severity": "HIGH",
  "risk_score": 85.0,
  "action": "BLOCK",
  "status_code": 403,
  "reason": "Unauthorized access to resource ACC002",
  "details": {},
  "decision_trace": [
    {"step": "BOLA_CHECK", "status": "FAIL", "detail": "..."}
  ]
}
```

### 4. `GET /api/policies`
Returns the current active backend policies.

**Response Schema (`PolicyResponse`)**:
```json
{
  "protection_mode": "ENFORCING",
  "bola": { "enabled": true },
  "ownership_validation": { "enabled": true },
  "rate_limiting": { "enabled": true, "requests": 100, "window_seconds": 60 },
  "payload_detection": { "enabled": true },
  "audit_logging": { "enabled": true },
  "websocket_telemetry": { "enabled": true }
}
```

### 5. `POST /api/simulator/bola`
Triggers the backend security engine deterministically for demo purposes.

**Request Schema (`SimulatorBolaRequest`)**:
```json
{
  "attacker_user_id": "U001",
  "target_resource_id": "ACC002",
  "protection_mode": "ENFORCING"
}
```

**Response Schema (`SimulatorBolaResponse`)**:
```json
{
  "request_id": "uuid",
  "success": false,
  "status_code": 403,
  "action": "BLOCK",
  "threat_type": "BOLA",
  "severity": "HIGH",
  "risk_score": 85.0,
  "response_data": {"detail": "Unauthorized access to resource ACC002"},
  "decision_trace": [ ... ]
}
```


## WebSocket Contract

### `ws://<host>/api/ws`
Streams real-time security events. The payload mimics the `SecurityEventResponse` but is wrapped in a type envelope and contains a monotonically increasing sequence number.

**Message Format**:
```json
{
  "type": "security_event",
  "sequence": 42,
  "data": {
    "event_id": "uuid",
    "request_id": "uuid",
    "timestamp": "2024-03-24T10:00:00Z",
    "source_ip": "127.0.0.1",
    "user_id": "U001",
    "username": "Alice",
    "method": "GET",
    "path": "/api/accounts/ACC002",
    "resource_id": "ACC002",
    "resource_owner_id": "U002",
    "threat_type": "BOLA",
    "severity": "HIGH",
    "risk_score": 85.0,
    "action": "BLOCK",
    "status_code": 403,
    "reason": "Unauthorized access to resource ACC002",
    "details": {
      "trace": [ ... ],
      "risk_factors": [ ... ]
    }
  }
}
```
