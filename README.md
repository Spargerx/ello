# Ello Security Dashboard & API Gateway

Ello is an API security platform featuring a dashboard and an active security gateway. It is designed to intercept API requests, evaluate them against security policies, detect threats (like BOLA - Broken Object Level Authorization, Rate Limiting, Injection Attacks), and visualize these events in a real-time dashboard.

## 🏗 Architecture

The project is split into two main components:

1. **Frontend (Dashboard & Attack Lab)**
   - Built with React, TypeScript, and Vite.
   - Uses `recharts` for charting and data visualization.
   - Interfaces with the backend API to retrieve traffic statistics, threat distribution, and request timelines.
   - Includes an "Attack Lab" to simulate API threats and view the gateway's real-time decisions.

2. **Backend (Security Gateway & API)**
   - Built with Python and FastAPI.
   - Uses PostgreSQL (via asyncpg/SQLAlchemy) to log security events and aggregate analytics.
   - Uses Redis for rate limiting and fast access.
   - Enforces configurable protection modes (Detection Only vs. Enforcing).
   - Validates JWTs, extracts request payloads, checks object ownership (BOLA prevention), and assesses risk scores.

## 🛠 Tech Stack

**Frontend:**
- React 19
- TypeScript
- Vite
- React Router
- Recharts (Data Visualization)
- Lucide React (Icons)

**Backend:**
- Python 3
- FastAPI
- SQLAlchemy (Async)
- PostgreSQL
- Redis
- Uvicorn
- Pydantic Settings

## 🚀 How It Works

1. **Request Interception**: Incoming API requests pass through the FastAPI gateway.
2. **Policy Evaluation**: The gateway validates the JWT, checks rate limits against Redis, and extracts resource IDs (e.g., from the path or payload).
3. **Threat Detection**: The gateway compares the authenticated user's ID against the requested resource's owner. If they don't match, a BOLA threat is flagged.
4. **Decision & Action**: Based on the configured `ELLO_PROTECTION_MODE` (active/monitor), the request is either blocked (HTTP 403) or allowed (HTTP 200), and a detailed `SecurityEvent` is logged to PostgreSQL.
5. **Visualization**: The React dashboard fetches these events and aggregates them into timelines, threat distributions, and top endpoint threat rankings.

## 💻 Getting Started (Running Locally)

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- PostgreSQL
- Redis

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy asyncpg psycopg2-binary redis pydantic-settings
   ```
4. Configure the environment variables in `backend/.env`:
   ```env
   ELLO_DATABASE_URL=postgresql+asyncpg://<username>:<password>@localhost:5432/ello_db
   ELLO_DATABASE_URL_SYNC=postgresql+psycopg2://<username>:<password>@localhost:5432/ello_db
   ELLO_REDIS_URL=redis://localhost:6379/0
   ELLO_JWT_SECRET=your_jwt_secret_key
   ELLO_JWT_ALGORITHM=HS256
   ELLO_PROTECTION_MODE=detection_only # or 'active'
   ```
5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Usage
- Open your browser and navigate to `http://localhost:5173` (or the port Vite provides).
- Explore the **Dashboard** to view request metrics and threats.
- Use the **Attack Lab** to simulate malicious API requests and test the gateway's defenses.

## 📜 License
This project is for educational and demonstrative purposes.
