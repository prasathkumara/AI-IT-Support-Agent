# Phase 2 RAG — End-to-End Smoke Test (Manual)

> **Spec:** Phase 2 RAG — Task 11 (Checkpoint) · **Requirements:** 9.2, 9.4, 10.2
>
> This guide walks you through a **real, live** end-to-end test of the RAG
> pipeline on your own machine. "Smoke test" just means: run the whole thing once
> with a simple input and confirm nothing catches fire — i.e. a document goes in,
> and a related question comes back answered **from that document**.

---

## What you are about to prove

RAG (Retrieval-Augmented Generation) has two halves. This test exercises **both,
end to end**:

```
INGESTION  (POST /knowledge)        text -> clean -> chunk -> embed -> store in MongoDB
RETRIEVAL  (chat endpoint)          question -> embed -> vector search -> top chunks -> Claude answers
```

If it works, the chat answer will contain a detail that **only exists in the
document you uploaded** — proving Claude answered from *our* knowledge base, not
from its general training.

> **New concept: smoke test vs. unit test.** The automated unit tests
> (`pytest`) check small pieces in isolation. A smoke test runs the *real,
> connected system* (web server + database + embedding model + Claude) against a
> live example. It's the closest thing to "a real user tried it".

---

## Why this can't run automatically in the dev sandbox

The automated checkpoint verified all the **wiring** (imports, graph edges,
route registration, the retrieve/ingest call chains). But a true live run needs
three things the sandbox doesn't have, so **you** run it locally:

1. **`sentence-transformers` installed** — the local embedding model (a few
   hundred MB). It is intentionally *not* in the sandbox venv.
2. **A live MongoDB Atlas connection + the vector index** — needed to store and
   search chunks.
3. **A working Claude API key** — needed for the chat endpoint to generate a
   reply.

---

## Prerequisites checklist

Work top to bottom. Each step builds on the previous one.

### (a) Install the backend, including `sentence-transformers`

From the `backend/` folder, with your virtual environment active:

```powershell
# Windows PowerShell, from d:\AI-IT-SUPPORT\AI-IT-SUPPORT-AGENT\backend
.venv\Scripts\Activate.ps1
pip install -e .
```

`pip install -e .` installs the project (and its dependencies, which now include
`sentence-transformers`) in "editable" mode, so your code changes take effect
without reinstalling.

> **Heads up — the first embedding is slow.** The *first* time any embedding
> runs, `sentence-transformers` downloads the `all-MiniLM-L6-v2` model to disk
> (one-time, cached afterwards). Later calls are fast. Don't panic if the first
> `/knowledge` request takes a while.

Quick confirm it imported:

```powershell
.venv\Scripts\python.exe -c "import sentence_transformers; print('sentence-transformers OK')"
```

### (b) Set your secrets in `backend/.env`

Open `backend/.env` and make sure these are set to **real** values:

```ini
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=ai_it_support
CLAUDE_API_KEY=sk-ant-...your real key...
CLAUDE_MODEL=claude-haiku-4-5-20251001
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384
```

> ⚠️ **Watch out for a stale `EMBEDDING_PROVIDER` environment variable.**
> Our config reads values from the environment with **higher priority** than the
> `.env` file (that's standard behaviour for pydantic-settings). During the
> checkpoint we found this terminal session had a typo'd `EMBEDDING_PROVIDER=loca`
> set at the *process* level, which **overrode** the correct `.env` value and
> made `get_embedding_provider()` raise `Unknown embedding_provider: 'loca'`.
>
> Before running, check your shell is clean:
>
> ```powershell
> echo "[$env:EMBEDDING_PROVIDER]"   # want [] or [local], NOT [loca]
> ```
>
> If it shows `loca` (or anything but `local`), clear it for the session:
>
> ```powershell
> $env:EMBEDDING_PROVIDER=$null
> ```
>
> **The lesson (worth remembering):** an OS environment variable will silently
> win over your `.env` file. If config "ignores" what you put in `.env`, check
> your real environment variables first.

### (c) Create the Atlas Vector Search index

Follow [`docs/atlas-vector-index.md`](./atlas-vector-index.md) exactly. In short:

- **Database:** `ai_it_support`  ·  **Collection:** `knowledge_chunks`
- **Index name:** `knowledge_vector_index` (must match exactly)
- **Definition:** 384 dimensions, cosine similarity

Wait until the index status is **Active** in the Atlas UI. `$vectorSearch`
returns nothing until it is active — so retrieval would silently find zero
chunks and Claude would answer from general knowledge instead.

### (d) Start the server

```powershell
# from backend/, venv active
uvicorn app.main:app --reload
```

You should see it start on `http://127.0.0.1:8000`. Confirm it's healthy:

```powershell
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/health/db
```

`/health` -> `{"status":"ok"}` (server up).
`/health/db` -> confirms MongoDB is reachable (your `MONGODB_URI` works).

Leave this terminal running and open a **second** terminal for the curl commands
below.

---

## The test

### (e) Ingest a sample IT-support document

We'll upload a short document with a **made-up, specific detail** so we can tell
for certain the answer came from it. Note the invented client name
"**GlobalConnect**" and the invented contact "**x4357**" — these do not exist in
Claude's training data, so if they show up in the answer, retrieval worked.

```powershell
curl -X POST http://127.0.0.1:8000/knowledge `
  -H "Content-Type: application/json" `
  -d '{
    "title": "VPN Setup Guide",
    "text": "ACME Corp VPN access. To connect to the company VPN, install the GlobalConnect client from the IT self-service portal. Launch GlobalConnect, enter your employee email as the username, and use your standard network password. If you see error VPN-521, your account is not yet enabled for remote access; contact the IT Service Desk at extension x4357 to request activation. VPN sessions automatically disconnect after 12 hours and must be re-established."
  }'
```

> **Note on quoting:** the backtick (`` ` ``) is PowerShell's line-continuation
> character. If you prefer one line, remove the backticks and put it all on a
> single line. On macOS/Linux use `\` for continuation and single quotes.

**Expected response** (HTTP 201). The important fields:

```json
{
  "document_id": "....",
  "title": "VPN Setup Guide",
  "status": "completed",
  "chunk_count": 1,
  "error": null
}
```

- `status: "completed"` and `error: null` -> ingestion worked end to end
  (clean -> chunk -> embed -> store).
- `chunk_count >= 1` -> it actually produced searchable chunks.
- If `status: "failed"`, read `error` — common causes: the embedding model
  couldn't load (step a), or MongoDB wasn't reachable (step b).

### (f) Ask a related question through the chat endpoint

The chat flow is **two calls**: first create a conversation, then post a message
into it. (Shapes come from `app/api/routes/conversations.py` and
`app/schemas/conversation.py`.)

**1. Create a conversation** (body needs just `employee_id`):

```powershell
curl -X POST http://127.0.0.1:8000/conversations `
  -H "Content-Type: application/json" `
  -d '{ "employee_id": "emp-123" }'
```

Copy the `id` from the response — that's your `conversation_id`.

**2. Post a question into it** (body needs just `content`). Ask something whose
answer lives in the uploaded doc, but **without quoting the doc**:

```powershell
curl -X POST http://127.0.0.1:8000/conversations/<conversation_id>/messages `
  -H "Content-Type: application/json" `
  -d '{ "content": "I keep getting error VPN-521 when I try to connect. What do I do?" }'
```

The response is the whole conversation. The **last message** (role `assistant`)
is Claude's answer. It should tell you that VPN-521 means your account isn't
enabled for remote access and to **contact the IT Service Desk at extension
x4357** — the exact invented detail from your document.

### (g) How to tell retrieval actually worked

You're looking for proof the answer came from **your document**, not Claude's
general knowledge:

- ✅ **The invented detail appears.** "x4357" and/or "GlobalConnect" show up in
  the answer. Claude could not know these unless retrieval fed it your chunk.
- ✅ **The specific VPN-521 meaning matches your doc** ("account not enabled for
  remote access"), not a generic guess.

If the answer is vague or generic (no x4357, no GlobalConnect), retrieval
probably returned nothing. Check, in order:

1. **Was the doc ingested?** The `/knowledge` response had `status: "completed"`
   and `chunk_count >= 1`.
2. **Is the Atlas index Active and named exactly `knowledge_vector_index`?**
   A wrong name or a still-building index silently returns zero matches.
3. **Do dimensions match?** `EMBEDDING_DIMENSION=384` in `.env` **and**
   `numDimensions: 384` in the Atlas index — they must agree.
4. **Is `EMBEDDING_PROVIDER` really `local`?** (see the stale-env warning in
   step b).

### Optional: see retrieval in isolation

To watch the retrieval half on its own (no Claude), run this from `backend/`
with the server's venv:

```powershell
.venv\Scripts\python.exe -c "from app.ai.rag.retrieval import retrieve; print([c.text[:80] for c in retrieve('VPN-521 error')])"
```

If it prints a snippet of your VPN doc, vector search + embeddings are working
and the problem (if any) is downstream in the Claude step.

---

## What the automated checkpoint already confirmed

So you know what's *already* been proven and what's left to you:

| Checked automatically (passed) | Needs this live test |
| --- | --- |
| Full `pytest` suite (8 passed) | A real document surviving ingestion into Atlas |
| `app.main` imports; `/knowledge` route registered | A real `$vectorSearch` returning the right chunk |
| Graph edges `START -> retrieve_knowledge -> call_claude -> END` | Claude answering with the retrieved content |
| `get_embedding_provider()` returns the local provider | The embedding model loading & encoding for real |
| `chunk_text`, `retrieve('')`, context injection all work | — |

The one thing worth flagging that the checkpoint surfaced: a stale
`EMBEDDING_PROVIDER=loca` process env var overriding `.env`. Clear it before you
run (step b).
