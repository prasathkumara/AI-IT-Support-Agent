"""Application entry point for the Backend_App (the FastAPI app).

This is the file that "starts" the backend. It creates the application object
and attaches the pieces that make up the API.

PHASE 2 ADDITION: connection lifecycle with "lifespan"
------------------------------------------------------
NEW CONCEPT: lifespan
    A web app needs to do some setup when it STARTS (open the database
    connection) and some cleanup when it STOPS (close that connection).
    FastAPI's "lifespan" is a single place to put both. The code before the
    `yield` runs at startup; the code after `yield` runs at shutdown.

CORS (so the browser frontend can call this API)
------------------------------------------------
NEW CONCEPT: CORS middleware
    The browser blocks a page served from one origin (e.g. the Next.js app on
    http://localhost:3000) from calling an API on a different origin (this API
    on :8000) unless the API returns headers saying that origin is allowed.
    CORSMiddleware adds those headers to every response. The allowed origins
    come from config (CORS_ALLOW_ORIGINS), so we don't hardcode URLs here.

How to run it locally (from the `backend/` folder):

    uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import conversations, health, knowledge, tickets
from app.core.config import get_settings
from app.db.mongodb import close_mongo_connection, connect_to_mongo


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # --- startup: runs once, before the app serves any request ---
    connect_to_mongo()
    yield
    # --- shutdown: runs once, as the app stops ---
    close_mongo_connection()


# Create the FastAPI application object and register the lifespan so the
# MongoDB connection opens at startup and closes at shutdown.
app = FastAPI(title="AI IT Support Platform", lifespan=lifespan)

# --- CORS ------------------------------------------------------------------
# Allow the frontend origin(s) listed in config to call this API from a browser.
# allow_credentials/allow_methods/allow_headers are permissive for local dev;
# tighten them for production if needed.
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach the routers. Each include_router line plugs in one feature's routes.
app.include_router(health.router)
app.include_router(conversations.router)
app.include_router(knowledge.router)
app.include_router(tickets.router)
