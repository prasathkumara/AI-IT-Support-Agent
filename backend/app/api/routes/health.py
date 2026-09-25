"""Health check routes for the Backend_App.

A FastAPI route is like a Next.js API route: a function that runs when a
specific URL is requested. Here we group routes on an APIRouter, which the
main app includes so the endpoints become reachable.

Phase 2 adds a second route, GET /health/db, that actually pings MongoDB so we
can SEE the database connection working (not just that the server is up).
"""

from fastapi import APIRouter

from app.db.mongodb import ping

# APIRouter collects related endpoints; the main app plugs it in (main.py).
router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    # Returning a dict lets FastAPI auto-serialize it to a JSON response with
    # a JSON content type. This checks only that the web server is alive.
    return {"status": "ok"}


@router.get("/health/db")
def health_db() -> dict[str, str]:
    """Confirm the app can actually reach MongoDB.

    Calls the lightweight ping() helper. If MongoDB responds, we report the
    database as connected; if anything goes wrong (bad URI, network blocked,
    wrong password), we report it as an error with the reason.
    """
    try:
        ok = ping()
        # "ok" here means MongoDB answered the ping successfully.
        return {"status": "ok" if ok else "error", "database": "connected"}
    except Exception as exc:  # noqa: BLE001 - we intentionally surface any failure
        # We return a readable message so YOU can see what went wrong while
        # learning (e.g. authentication failed, timeout). We keep it a 200 body
        # with an "error" status here for simplicity in Phase 2.
        return {"status": "error", "database": "disconnected", "detail": str(exc)}
