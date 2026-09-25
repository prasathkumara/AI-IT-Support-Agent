# Backend — AI IT Support Platform

The backend is a **FastAPI** application organized as a modular monolith
(one deployable app with clear internal modules). This README explains how to
set it up and run it locally.

## Prerequisites

- **Python 3.11 or newer** installed (check with `python --version`).

## First-time setup

We use a **virtual environment** (a private, isolated Python sandbox for this
project) so this project's libraries never clash with other projects on your
machine. Run these commands **from the `backend/` folder**.

### 1. Create the virtual environment

```powershell
python -m venv .venv
```

This creates a `.venv/` folder holding a private copy of Python. It is
git-ignored, so it never gets committed — each developer creates their own.

### 2. Activate it

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source .venv/bin/activate
```

Once active, your prompt shows `(.venv)` at the start. That tells you you're
inside the sandbox. To leave it later, type `deactivate`.

> If PowerShell blocks the activate script with an execution-policy error, run
> this once for your user, then activate again:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

### 3. Install dependencies

We declare dependencies in `pyproject.toml` (the modern replacement for
`requirements.txt`), so we install straight from it:

```powershell
pip install -e ".[dev]"
```

- `-e` = "editable" install: changes to the code take effect without
  reinstalling.
- `.` = install the project in this folder.
- `[dev]` = also install the development extras (pytest, httpx) for running
  tests.

### 4. Configure environment variables

Copy the template to a real, local `.env` file and fill in your values:

```powershell
copy .env.example .env
```

Then open `.env` and set at least `MONGODB_URI` (your MongoDB Atlas connection
string). The `.env` file is git-ignored, so your secrets stay on your machine.

## Running the app

```powershell
uvicorn app.main:app --reload
```

- `app.main:app` = "in the module `app.main`, use the variable named `app`".
- `--reload` = auto-restart when you edit code (handy while developing).

Then open in your browser:

- http://127.0.0.1:8000/health — server health, returns `{"status": "ok"}`
- http://127.0.0.1:8000/health/db — pings MongoDB to confirm the DB is reachable
- http://127.0.0.1:8000/docs — FastAPI's auto-generated interactive API docs

## Running the tests

```powershell
python -m pytest -q
```

## Everyday workflow (after first-time setup)

You don't recreate the venv each time. Just:

```powershell
.\.venv\Scripts\Activate.ps1   # activate
uvicorn app.main:app --reload  # run
```

## Project layout (backend)

```
backend/
├─ app/
│  ├─ main.py              # App entry point; opens/closes the DB connection
│  ├─ core/
│  │  └─ config.py         # Typed settings loaded from .env (Pydantic Settings)
│  ├─ db/
│  │  └─ mongodb.py        # MongoDB connection open/close + ping helper
│  ├─ api/routes/
│  │  └─ health.py         # GET /health and GET /health/db
│  ├─ models/ schemas/ repositories/ services/   # (later phases)
│  ├─ ai/                  # LangGraph agent, Claude, RAG   (later phases)
│  └─ integrations/        # storage + identity              (later phases)
├─ tests/
├─ pyproject.toml          # dependencies + project config
└─ .env.example            # config template (copy to .env)
```
