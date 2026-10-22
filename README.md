# AI IT Support Platform

Welcome! This is an **AI-first internal IT support platform**. The idea is simple: instead of
filling out a form and waiting, an employee describes their IT problem in plain language and an
AI agent tries to help right away. The AI understands the issue, looks up relevant company
knowledge, walks the person through troubleshooting, and either resolves the conversation or
hands it off to a human IT Admin as a ticket.

This is a learning project built step by step, so the codebase is organized into clear
**phases**. We only build what the current phase asks for — nothing more. If you're new to
AI agents, Next.js, FastAPI, or RAG, don't worry: the structure below is meant to be read
top to bottom and understood one piece at a time.

## What the platform does

There are two kinds of users (we call them **roles**):

- **Employee** — reports an IT issue and chats with the AI to try to solve it.
- **IT Admin** — manages the company knowledge documents and handles tickets that the AI
  couldn't resolve.

The core flow looks like this:

1. An **Employee** describes a problem.
2. The **AI** figures out what the issue is about (its intent).
3. The AI retrieves relevant company knowledge using **RAG** (explained below) and reasons
   about the problem.
4. The AI gives troubleshooting guidance and asks whether the issue is fixed.
5. If it's fixed, the conversation is marked complete. If not, the AI **escalates** it into a
   **ticket** that includes the full conversation, which an **IT Admin** then handles.

> **New concept: RAG (Retrieval-Augmented Generation).** RAG means the AI doesn't answer
> purely from memory. Before answering, it _retrieves_ relevant snippets from your company's
> own documents and uses them to ground its response. Think of it as an open-book exam instead
> of a closed-book one — the AI gets to look things up first.

## Tech stack

Here's the toolkit we're using, grouped by area. In Phase 1 most of these are only _planned_
(the folders exist so there's a home for them later), not yet implemented.

| Area                  | Tools                                                  |
| --------------------- | ------------------------------------------------------ |
| **Frontend**          | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui    |
| **Backend**           | Python, FastAPI, Pydantic                              |
| **AI orchestration**  | LangGraph                                              |
| **LLM (the "brain")** | Claude Enterprise                                      |
| **RAG**               | Text chunking, embeddings, MongoDB Atlas Vector Search |
| **Database**          | MongoDB Atlas                                          |
| **File storage**      | Azure Blob Storage or AWS S3 (configurable)            |
| **Authentication**    | Manual auth (added in a later phase)                   |
| **Testing**           | Pytest (backend), Playwright (frontend)                |
| **Deployment**        | Docker                                                 |
| **Version control**   | Git                                                    |

> **New concept: LangGraph vs Claude.** These do different jobs. **Claude** is the language
> model that reasons and writes the actual answer. **LangGraph** is the _orchestrator_ — it
> decides the steps ("first understand the issue, then look up knowledge, then ask Claude").
> Keeping them separate means we can change how the conversation flows without touching the
> model, and vice versa.

## Monorepo layout

This project is a **monorepo** — a single Git repository that holds several related parts
together. Here are the top-level folders and what each is for:

```
ai-it-support/
├── frontend/   # The Next.js web app (what users see in the browser)
├── backend/    # The FastAPI service (APIs, business logic, and later the AI layer)
├── docs/       # Architecture notes, decision records, and development guides
└── infra/      # Infrastructure and deployment files (e.g. Docker, config)
```

- **`frontend/`** — the user interface. Built with Next.js (App Router) and TypeScript.
- **`backend/`** — the server. A FastAPI app organized as a _modular monolith_ (one deployable
  app with clear internal modules), which will later host the AI agent, RAG, and database
  access.
- **`docs/`** — written documentation: how the system is designed and _why_ we made key
  choices.
- **`infra/`** — files for running and deploying the platform (containers, environment setup).

> **New concept: monorepo.** A monorepo keeps the frontend, backend, and docs in one
> repository instead of scattering them across several. For a small team it's easier to keep
> everything in sync and see the whole project in one place.

## Phased approach

We build this platform in **phases**. Each phase is a small, understandable chunk. This keeps
the learning curve gentle and prevents the project from turning into a confusing pile of
half-built features.

### Phase 1 (current) — Scaffold + minimal bootstrap

Phase 1 delivers **only** the folder structure and the smallest possible files that prove the
project can start:

- A Next.js **home page** that displays the text **"AI IT Support Platform"**.
- A FastAPI **health endpoint** at `GET /health` that returns `{"status": "ok"}`.
- Root configuration files (this README, `.gitignore`, `.env.example` templates,
  `docker-compose.yml`).

That's it. In Phase 1 there is **no** business logic, **no** AI or LangGraph, **no** RAG, **no**
database, **no** authentication, and **no** feature screens. We're just building a skeleton we
can run.

### Later phases (roadmap — NOT built yet)

These are planned for future phases and are documented here so we have the full picture. **None
of them are implemented yet.** They'll be built one phase at a time, in roughly this order:

- Backend modular monolith modules (services, repositories, and their boundaries)
- AI agent orchestration with **LangGraph**
- **Claude** LLM integration (reasoning and response generation)
- **RAG subsystem** (document ingestion, chunking, embeddings, retrieval)
- **MongoDB Atlas** database + **Vector Search**
- File storage abstraction (Azure Blob or AWS S3, chosen via config)
- Authentication (manual auth)
- Employee support flow (chat, troubleshooting, resolution)
- IT Admin flow (knowledge management, handling tickets)
- Ticketing (capturing full conversation context)
- Notifications (ticket created / resolved alerts)
- Analytics (resolution rates, knowledge gaps)
- Documentation (architecture and decision records)
- Testing (Pytest and Playwright coverage as features are added)

### The rule

> **No later-phase feature is implemented until that phase is explicitly requested.**

If a change would introduce something from a later phase (AI logic, RAG, database, auth, feature
UI, etc.) while an earlier phase is active, we defer it. This is intentional: it keeps each phase
focused and easy to understand, which matters a lot on a first AI project.

## Getting started

This section shows how to run the **backend** (FastAPI) and the **frontend** (Next.js) locally. Run them in **two separate terminals** - each is a long-running server you keep open while developing.

> Commands are written for **Windows PowerShell** (the project default shell). On macOS/Linux use forward-slash paths, `source .venv/bin/activate`, and `cp` instead of `copy`.

### Prerequisites

- **Python 3.11+** (backend)
- **Node.js 18+** and **npm** (frontend)
- A **MongoDB Atlas** connection string and a **Claude API key**

### 1. Backend (FastAPI) - http://localhost:8000

From the repository root:

```powershell
cd backend

# Create and activate a virtual environment (first time only)
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install the backend and its dependencies
pip install -e .

# Create your local .env from the template, then fill in real values
copy .env.example .env
#   -> set MONGODB_URI and CLAUDE_API_KEY at minimum

# Start the API server (auto-reloads on code changes)
uvicorn app.main:app --reload
```

Confirm it is working:

- http://localhost:8000/health -> `{"status": "ok"}`
- http://localhost:8000/health/db -> confirms MongoDB is reachable
- http://localhost:8000/docs -> interactive API docs

> **Tip:** the first chat/RAG request downloads the local embedding model (~90 MB) once, so it may pause briefly the first time.

### 2. Frontend (Next.js) - http://localhost:3000

In a **second** terminal, from the repository root:

```powershell
cd frontend

# Install dependencies (first time only)
npm install

# Create your local .env from the template
copy .env.example .env

# Start the dev server (hot-reloads on code changes)
npm run dev
```

Open **http://localhost:3000**. Sign-in is simulated - use a demo account from the login screen:

- **Employee:** `alex.morgan@contoso.com`
- **IT Admin:** `it.admin@contoso.com`

> **Note:** the frontend calls the backend at `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`). If Next.js starts on a different port (e.g. 3001), make sure that port is in the backend `CORS_ALLOW_ORIGINS` so the browser is not blocked by CORS.

### Running both together

The app works fully only when **both** servers run at once: the frontend (3000) serves the UI and calls the backend (8000) for AI chat, knowledge, and tickets. Start the backend first, then the frontend.
