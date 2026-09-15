# ello — Intelligent API Security Gateway & Security Operations Center

ello is an API security platform that combines an intelligent security gateway with a real-time Security Operations Center (SOC).

It evaluates incoming API requests before they reach protected application logic. The gateway validates identity, checks authorization and resource ownership, detects suspicious payloads, applies rate-limiting policies, calculates risk, and decides whether a request should be allowed, detected, or blocked.

Security events are persisted in PostgreSQL and streamed to the React dashboard through WebSockets, giving security teams real-time visibility into API security activity.

The primary security scenario demonstrated by ello is **Broken Object Level Authorization (BOLA)**.

---

## What problem does ello solve?

Authentication answers:

> "Who is this user?"

But authentication alone does not answer:

> "Is this user actually allowed to access this specific object?"

For example:

```text
Alice (U001)
   |
   | valid JWT
   v
GET /api/accounts/ACC002
   |
   v
ACC002 belongs to Bob (U002)
```

Alice can have a valid JWT while still being unauthorized to access `ACC002`.

ello detects this ownership violation as a BOLA attack and can block the request before the protected API handler returns the resource.

### Legitimate request

```text
Alice / U001
      |
      v
ACC001
      |
      v
Owner = U001
      |
      v
ALLOW → HTTP 200
```

### BOLA attack

```text
Alice / U001
      |
      v
ACC002
      |
      v
Owner = U002
      |
      v
BOLA DETECTED
      |
      v
BLOCK → HTTP 403
```

---

# Key Features

- JWT authentication and identity extraction
- Broken Object Level Authorization (BOLA) detection
- Resource ownership validation
- Rate limiting using Redis
- Basic payload/injection threat detection
- Explainable risk scoring
- Ordered security decision trace
- `ENFORCING` protection mode
- `DETECTION_ONLY` protection mode
- Security event persistence
- Real-time WebSocket security-event streaming
- Real-time Security Operations Center dashboard
- Traffic monitoring
- Threat analytics
- Endpoint threat ranking
- Security event details
- BOLA Attack Lab
- BOLA attack sweep
- Gateway policy view
- Backend-driven dashboard statistics
- Loading, empty, and error states

---

# Architecture

```text
                         ┌─────────────────────────┐
                         │       React SOC          │
                         │   Dashboard / Attack Lab │
                         └────────────┬────────────┘
                                      │
                           REST API + WebSocket
                                      │
                                      v
┌───────────────┐          ┌─────────────────────────┐
│ API Client /  │ ───────> │   ello Security Gateway │
│ Attack Lab    │          │        FastAPI           │
└───────────────┘          └────────────┬────────────┘
                                        │
                              Security Pipeline
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 │                      │                      │
                 v                      v                      v
          JWT Validation         Rate Limiting          Threat Detection
                                      │
                                      v
                              Resource / BOLA Check
                                      │
                                      v
                              Risk Assessment
                                      │
                                      v
                              Security Decision
                         ┌────────────┼────────────┐
                         │            │            │
                       ALLOW        DETECT        BLOCK
                         │            │            │
                         └────────────┼────────────┘
                                      │
                                      v
                              Security Event
                                      │
                       ┌──────────────┴──────────────┐
                       v                             v
                PostgreSQL                       WebSocket
              Event Persistence                  Event Stream
                       │                             │
                       └──────────────┬──────────────┘
                                      v
                              React SOC Dashboard
```

---

# Repository Structure

```text
ello/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   ├── db/
│   │   │   └── seed.py
│   │   ├── gateway/
│   │   │   ├── middleware.py
│   │   │   ├── bola.py
│   │   │   ├── rate_limiter.py
│   │   │   ├── payload_detector.py
│   │   │   └── risk_engine.py
│   │   ├── services/
│   │   ├── websocket/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Dashboard/
│   │   │   ├── AttackLab/
│   │   │   ├── Traffic/
│   │   │   ├── ThreatAnalytics/
│   │   │   └── Policies/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

# Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React 19 | User interface |
| TypeScript | Type-safe frontend development |
| Vite | Development server and build tool |
| React Router | Application routing |
| Recharts | Security analytics and charts |
| Lucide React | UI icons |
| WebSocket | Real-time security events |

## Backend

| Technology | Purpose |
|---|---|
| Python | Backend implementation |
| FastAPI | API and security gateway |
| SQLAlchemy | Database ORM / async database access |
| asyncpg | PostgreSQL async driver |
| psycopg2 | PostgreSQL synchronous driver |
| PostgreSQL | Security events and application data |
| Redis | Rate limiting / fast state |
| Pydantic Settings | Environment configuration |
| Uvicorn | ASGI application server |
| JWT / HS256 | Request authentication |

---

# How the Security Gateway Works

Every protected request goes through a security pipeline before the application handler is allowed to process it.

A simplified flow is:

```text
Incoming Request
      |
      v
Request ID
      |
      v
JWT Validation
      |
      v
Rate Limit Check
      |
      v
Resource Extraction
      |
      v
BOLA / Ownership Check
      |
      v
Payload / Injection Detection
      |
      v
Risk Assessment
      |
      v
Security Decision
      |
      +------> ALLOW
      |
      +------> DETECT
      |
      +------> BLOCK
      |
      v
Security Event
      |
      +------> PostgreSQL
      |
      +------> WebSocket
```

The checks and decision trace are recorded so the system can explain why a request was allowed, detected, or blocked.

---

# BOLA Detection

BOLA detection uses the relationship between a user and a resource.

For example, the seeded database contains:

```text
U001 → Alice
U002 → Bob

ACC001 → U001
ACC002 → U002
ACC003 → Demo account
```

If Alice sends:

```http
GET /api/accounts/ACC001
```

the gateway resolves:

```text
Authenticated user = U001
Requested resource = ACC001
Resource owner     = U001
```

The ownership check succeeds:

```text
ALLOW
```

If Alice instead sends:

```http
GET /api/accounts/ACC002
```

the gateway resolves:

```text
Authenticated user = U001
Requested resource = ACC002
Resource owner     = U002
```

The ownership check fails:

```text
BOLA detected
```

In `ENFORCING` mode:

```text
HTTP 403
Action = BLOCK
Threat = BOLA
```

The protected handler is not allowed to return the protected resource.

---

# Protection Modes

ello supports two protection modes.

## ENFORCING

Security violations are actively blocked.

```text
BOLA detected
      ↓
Risk assessment
      ↓
BLOCK
      ↓
HTTP 403
```

## DETECTION_ONLY

Security violations are detected and recorded, but the request is allowed to continue.

```text
BOLA detected
      ↓
Risk assessment
      ↓
DETECT
      ↓
HTTP 200
```

This mode is useful when evaluating a security policy before enabling active enforcement.

The backend is the source of truth for the protection mode.

---

# Risk Scoring

ello calculates a deterministic risk score from security signals.

The score contributes to the security decision and is included in security events and decision traces.

For example, a BOLA event can be represented as:

```text
Threat: BOLA
Severity: CRITICAL
Risk Score: 90
Action: BLOCK
```

This makes the decision explainable rather than treating the gateway as a black box.

---

# Security Events

When the gateway detects a security-relevant request, it creates a security event.

Events can contain information such as:

- Event ID
- Timestamp
- Request ID
- User
- HTTP method
- API path
- Resource
- Resource owner
- Threat type
- Severity
- Risk score
- Action
- HTTP status
- Reason
- Decision trace

Events are persisted in PostgreSQL and can be retrieved through the REST API.

The WebSocket layer also broadcasts security events to connected SOC dashboards.

---

# Real-Time Security Operations Center

The dashboard does not rely on hard-coded security statistics.

It obtains state from the backend through REST APIs and receives live security events through WebSocket.

The dashboard provides:

### Security overview

- Total requests
- Blocked requests
- Detected threats
- High-risk events
- BOLA activity

### Visual analytics

- Request timeline
- Threat distribution
- Endpoint threat ranking

### Live security events

The event stream displays newly generated security events as they arrive from the gateway.

Events include their action, threat type, severity, risk score, user, endpoint, and resource.

---

# Attack Lab

The Attack Lab provides a controlled way to demonstrate the gateway.

A typical BOLA test is:

```text
Attacker:
Alice / U001

Target:
ACC002

Owner:
Bob / U002
```

The Attack Lab sends the request through the actual backend security pipeline. It is not a frontend-only simulation.

Example:

```text
Alice → ACC002
      ↓
JWT validation
      ↓
BOLA ownership check
      ↓
BOLA detected
      ↓
Risk assessment
      ↓
BLOCK / DETECT
```

The Attack Lab also provides a BOLA sweep to demonstrate multiple resource-access decisions.

---

# Backend API

The backend exposes APIs including:

```text
GET  /health
GET  /api/dashboard
GET  /api/events
GET  /api/events/{event_id}
GET  /api/traffic
GET  /api/analytics
GET  /api/policies

POST /api/simulator/bola

GET  /api/accounts/{account_id}

WS   /ws/security-events
```

FastAPI also provides interactive API documentation.

After starting the backend:

```text
http://127.0.0.1:8000/docs
```

---

# Running ello Locally

The following instructions assume a fresh clone of the repository.

## Prerequisites

Install:

- Git
- Python 3.10+
- Node.js 18+
- PostgreSQL
- Redis

Verify the installations:

```bash
python --version
node --version
npm --version
git --version
```

PostgreSQL and Redis must be running before starting the backend.

---

# 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd ello
```

The repository contains both the frontend and backend:

```text
ello/
├── backend/
└── frontend/
```

Do not create separate Git repositories inside these directories.

---

# 2. Create the PostgreSQL Database

Create a PostgreSQL database for ello.

For example:

```sql
CREATE DATABASE ello_db;
```

Optionally create a dedicated PostgreSQL user:

```sql
CREATE USER ello_user WITH PASSWORD 'your_password';
```

Grant access:

```sql
GRANT ALL PRIVILEGES ON DATABASE ello_db TO ello_user;
```

The PostgreSQL username and password are up to the local installation.

---

# 3. Configure the Backend

Move into the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

### Windows

```powershell
.\venv\Scripts\Activate.ps1
```

### macOS / Linux

```bash
source venv/bin/activate
```

Install the project's dependencies:

```bash
pip install -r requirements.txt
```

Create:

```text
backend/.env
```

Example configuration:

```env
ELLO_DATABASE_URL=postgresql+asyncpg://<username>:<password>@localhost:5432/ello_db
ELLO_DATABASE_URL_SYNC=postgresql+psycopg2://<username>:<password>@localhost:5432/ello_db

ELLO_REDIS_URL=redis://localhost:6379/0

ELLO_JWT_SECRET=change-this-development-secret
ELLO_JWT_ALGORITHM=HS256
ELLO_JWT_EXPIRY_HOURS=24

ELLO_PROTECTION_MODE=detection_only

ELLO_RATE_LIMIT_RPM=60
```

For active blocking:

```env
ELLO_PROTECTION_MODE=enforcing
```

**Never commit a real `.env` file, database password, JWT secret, or other credentials to Git.**

---

# 4. Seed the Database

The project includes a seed script that creates demo users, accounts, and transactions.

With the backend virtual environment activated:

```bash
python -m app.db.seed
```

The demo data includes:

```text
Users:
U001 → Alice
U002 → Bob
U003 → Admin

Accounts:
ACC001 → Alice
ACC002 → Bob
ACC003 → Demo account
```

The seed operation is normally needed only when setting up or resetting the local database.

---

# 5. Start the Backend

From:

```text
ello/backend
```

run:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

The backend should be available at:

```text
http://127.0.0.1:8000
```

Check the health endpoint:

```bash
curl http://127.0.0.1:8000/health
```

Or open:

```text
http://127.0.0.1:8000/docs
```

---

# 6. Start the Frontend

Open a second terminal.

Move to:

```bash
cd ello/frontend
```

Install frontend dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

Vite will display the local URL, normally:

```text
http://localhost:5173
```

Open that URL in your browser.

---

# 7. Verify the Installation

After starting both services:

### Check the dashboard

Open the Vite URL.

The Security Operations Center should load.

### Check the backend

```text
http://127.0.0.1:8000/health
```

### Check the API documentation

```text
http://127.0.0.1:8000/docs
```

### Check WebSocket

The dashboard should show the WebSocket connection as connected.

### Run the BOLA demonstration

Use the Attack Lab to test:

```text
Alice → ACC001
```

Expected:

```text
200
ALLOW
```

Then test:

```text
Alice → ACC002
```

in `ENFORCING` mode.

Expected:

```text
403
BLOCK
BOLA
```

Then switch to `DETECTION_ONLY`.

Expected:

```text
200
DETECT
BOLA
```

The corresponding security event should appear in the dashboard.

---

# Complete Startup Summary

Once PostgreSQL and Redis are running:

## Terminal 1 — Backend

```powershell
cd ello\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

## Terminal 2 — Frontend

```powershell
cd ello\frontend
npm run dev
```

Then open the Vite URL shown by the frontend terminal.

If the database is empty, seed it once:

```powershell
cd ello\backend
.\venv\Scripts\Activate.ps1
python -m app.db.seed
```

---

# Troubleshooting

## Database connection failed

Check that PostgreSQL is running and verify:

```env
ELLO_DATABASE_URL=...
ELLO_DATABASE_URL_SYNC=...
```

Make sure the database name, username, password, and port match your local PostgreSQL installation.

---

## Redis connection problems

Check that Redis is running and that:

```env
ELLO_REDIS_URL=redis://localhost:6379/0
```

matches the local Redis configuration.

---

## Dashboard cannot connect to backend

Verify:

```text
http://127.0.0.1:8000/health
```

Then refresh the frontend.

Also check the browser developer console for connection errors.

---

## Dashboard contains no demo data

Run:

```bash
cd backend
python -m app.db.seed
```

Then restart the backend if necessary and refresh the dashboard.

---

## Frontend dependencies are missing

Run:

```bash
cd frontend
npm install
npm run dev
```

---

# Development Commands

## Backend

Start development server:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Seed/reset demo data:

```bash
python -m app.db.seed
```

## Frontend

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build the frontend:

```bash
npm run build
```

---

# Security Model

ello is primarily a hackathon and demonstration project. It should not be treated as a production-ready security gateway without additional hardening.

The project demonstrates:

- Authentication
- Authorization
- Object ownership validation
- Threat detection
- Risk assessment
- Security enforcement
- Security-event logging
- Real-time security monitoring

A production deployment would additionally require appropriate secret management, stronger authentication infrastructure, deployment hardening, comprehensive attack detection, extensive testing, observability, and infrastructure security controls.

---

# Core Demo Scenario

The primary demonstration is intentionally simple and easy to understand.

### 1. Legitimate access

```text
Alice / U001
      ↓
GET /api/accounts/ACC001
      ↓
ACC001 owner = U001
      ↓
ALLOW
      ↓
HTTP 200
```

### 2. BOLA attack

```text
Alice / U001
      ↓
GET /api/accounts/ACC002
      ↓
ACC002 owner = U002
      ↓
BOLA detected
      ↓
Risk assessment
      ↓
BLOCK
      ↓
HTTP 403
```

### 3. Security event

```text
BOLA event
    ↓
PostgreSQL
    +
WebSocket
    ↓
Security Operations Center
```

The result is an end-to-end flow:

**API request → security analysis → decision → event persistence → real-time SOC visibility.**

---

# Project Status

ello is a hackathon project focused on demonstrating an end-to-end API security workflow, with BOLA protection as the primary security capability.

The implementation prioritizes:

1. Reliable BOLA detection
2. Explainable security decisions
3. Real gateway enforcement
4. Persistent security events
5. Real-time dashboard updates
6. A reproducible local development environment

---

# License

This project is intended for educational, demonstration, and hackathon purposes.
