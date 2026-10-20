"""Application entry point for the Backend_App (the FastAPI app).

This is the file that "starts" the backend. It creates the application object
and attaches the pieces that make up the API.

PHASE 2 ADDITION: connection lifecycle with "lifespan"
------------------------------------------------------
NEW CONCEPT: lifespan
    A web app needs to do some setup when it STARTS (open the database
    connection) and some cleanup when it STOPS (close that connection).
    FastAPI's "lifespan" is a single place to put both. The code before the
    `yield` runs at startup; the code after `yield` runs at shutdown. Think of
    it like: "open the shop in the morning (connect), serve customers, then lock
    up at night (disconnect)."

How to run it locally (from the `backend/` folder):

    uvicorn app.main:app --reload

    Then open:
      http://127.0.0.1:8000/health      -> {"status": "ok"}   (server is up)
      http://127.0.0.1:8000/health/db   -> pings MongoDB       (DB is reachable)
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI

from app.api.routes import conversations, health, knowledge
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

# Attach the routers. Each include_router line plugs in one feature's routes.
# This is the "wall socket" — main.py only wires groups in; the endpoints
# themselves live in their own files (health.py, conversations.py).
app.include_router(health.router)
app.include_router(conversations.router)
app.include_router(knowledge.router)
