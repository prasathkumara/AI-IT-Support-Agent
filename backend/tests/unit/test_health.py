"""Smoke test for the backend Health_Endpoint (GET /health).

What is a Pytest test?
    Pytest discovers and runs any function whose name starts with ``test_``.
    Inside such a function you use plain ``assert`` statements: if the condition
    is True the test passes, if it's False Pytest reports a failure. There is no
    special "expect(...)" syntax like some JS test runners — just normal Python.

What is TestClient?
    ``TestClient`` (from FastAPI/Starlette) calls our app *in-process*: it sends a
    request straight into the FastAPI ``app`` object and hands back the response,
    without starting a real HTTP server or opening a network port. That makes the
    test fast and self-contained. (It uses the ``httpx`` library internally, which
    is why ``httpx`` is a dev dependency in pyproject.toml.)

    Compare to Node: it's like calling your Express handler directly in a test
    instead of spinning up the server and hitting it with fetch().

This is an example-based *smoke test*: it checks one concrete, known-good case to
prove the endpoint is wired up and responding correctly. Phase 1 has no
transformation logic, so simple examples are the right tool (no property tests).
"""

from fastapi.testclient import TestClient

# Import the actual FastAPI application object we want to exercise.
# `app` is created in app/main.py and already has the health router attached.
from app.main import app

# One client instance is enough for these read-only checks. Creating it here
# (module level) means every test below reuses the same in-process client.
client = TestClient(app)


def test_health_returns_ok() -> None:
    """GET /health should answer 200, JSON content type, and {"status": "ok"}.

    This directly mirrors the Health_Endpoint contract in the requirements
    (status 200, a JSON content type, and the exact body).
    """
    # Act: send a GET request to /health through the in-process client.
    response = client.get("/health")

    # Assert 1 — HTTP status is 200 OK (Requirement 3.3).
    assert response.status_code == 200

    # Assert 2 — the response is JSON. The Content-Type header can include a
    # charset (e.g. "application/json; charset=utf-8"), so we check the prefix
    # rather than an exact match (Requirements 3.2, 3.3).
    assert response.headers["content-type"].startswith("application/json")

    # Assert 3 — the parsed JSON body matches the contract exactly (Req 3.2/3.3).
    assert response.json() == {"status": "ok"}


def test_health_rejects_post_with_405() -> None:
    """POST /health should be rejected as Method Not Allowed (Requirement 3.4).

    The route is declared for GET only, so FastAPI answers other methods on the
    same path with HTTP 405. We also confirm the success body is NOT returned.
    """
    # Act: use the wrong HTTP method on the same path.
    response = client.post("/health")

    # Assert — a client-error "method not allowed" status, and no success body.
    assert response.status_code == 405
    assert response.json() != {"status": "ok"}
