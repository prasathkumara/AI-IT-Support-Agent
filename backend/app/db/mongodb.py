"""MongoDB connection management (Phase 2).

WHAT THIS FILE DOES
-------------------
This module owns the single connection to MongoDB Atlas. It opens the
connection when the app starts and closes it when the app stops, and it hands
out the database object to whoever needs it.

NEW CONCEPT: connection lifecycle / connection pool
    You do NOT open a new database connection on every request — that would be
    slow. Instead you create ONE MongoClient at startup. Internally that client
    keeps a small "pool" of reusable connections and shares them across requests.
    We create it once, reuse it everywhere, and close it once at shutdown.

DESIGN NOTE (separation of concerns)
    This file only knows HOW to connect. It does not contain business logic or
    queries — those will live in the repository layer (app/repositories/) in a
    later step. Keeping "how we connect" separate from "what we query" is the
    repository pattern from our design.
"""

from pymongo import MongoClient
from pymongo.database import Database

from app.core.config import get_settings


class MongoConnection:
    """Holds the single MongoClient and the active Database handle.

    We wrap these in a tiny class so the rest of the app has one clear object to
    talk to, and so tests can inspect/replace it easily.
    """

    client: MongoClient | None = None
    database: Database | None = None


# A module-level singleton. `from app.db.mongodb import mongo` gives everyone the
# same instance, so they all share the one connection.
mongo = MongoConnection()


def connect_to_mongo() -> None:
    """Open the MongoDB connection using the configured URI.

    Called once at application startup (see app/main.py lifespan).
    """
    settings = get_settings()
    # Create the client. serverSelectionTimeoutMS keeps startup from hanging
    # forever if the URI is wrong or the network blocks us — it fails fast.
    mongo.client = MongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
    )
    # Select the logical database by name. MongoDB creates it lazily on first
    # write, so it's fine if it doesn't "exist" yet.
    mongo.database = mongo.client[settings.mongodb_database]


def close_mongo_connection() -> None:
    """Close the MongoDB connection cleanly at application shutdown."""
    if mongo.client is not None:
        mongo.client.close()
        mongo.client = None
        mongo.database = None


def get_database() -> Database:
    """Return the active Database handle.

    Raises a clear error if called before the connection was opened, which helps
    catch wiring mistakes early.
    """
    if mongo.database is None:
        raise RuntimeError(
            "MongoDB is not connected. Did the app startup run connect_to_mongo()?"
        )
    return mongo.database


def ping() -> bool:
    """Ask MongoDB to confirm it's reachable.

    Runs the lightweight admin "ping" command. Returns True on success. This is
    what our /health/db endpoint uses to prove the connection actually works.
    """
    if mongo.client is None:
        raise RuntimeError("MongoDB client is not initialized.")
    # The ping command returns {"ok": 1.0} when the server responds.
    result = mongo.client.admin.command("ping")
    return bool(result.get("ok") == 1.0)
