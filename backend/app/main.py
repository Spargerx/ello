"""Main FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import close_db, init_db
from app.api.routes import demo_api, simulator, dashboard, events as api_events, policies
from app.websocket import events


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing ello Gateway...")
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down ello Gateway...")
    await close_db()


app = FastAPI(
    title="ello API Security Gateway",
    description="Intelligent API Security Operations Center",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(simulator.router, tags=["Simulator"])
app.include_router(demo_api.router, prefix="/api", tags=["Demo Business API"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(api_events.router, prefix="/api", tags=["Events & Traffic"])
app.include_router(policies.router, prefix="/api", tags=["Policies"])
app.include_router(events.router, tags=["WebSocket"])
