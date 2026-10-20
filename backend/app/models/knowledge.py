"""Knowledge domain models (Phase 2 — RAG).

NEW CONCEPT: RAG (Retrieval-Augmented Generation)
    Instead of letting Claude answer from its general training knowledge, we
    store OUR OWN company documents and feed the most relevant snippets to
    Claude at question time. These models describe how that stored knowledge
    looks inside the app and the database.

Just like `conversation.py`, these are *models* (internal shape of our data),
not *schemas* (what crosses the API boundary — those live in
app/schemas/knowledge.py). Keeping them separate lets us change internals
without breaking the public API.

Two pieces of data make up our knowledge base:
  - KnowledgeDocument: one whole source document (e.g. "VPN Setup Guide").
  - KnowledgeChunk:    a small slice of that document's text, plus the numeric
                       "embedding" we search over.

NEW CONCEPT: why split a document into chunks?
    A full document is often too big to feed to the model and too coarse to
    search accurately. We cut it into smaller overlapping pieces ("chunks") so
    retrieval can pull back just the paragraphs that actually answer the
    question. Each chunk is stored separately and remembers which document it
    came from.
"""

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class IngestionStatus(str, Enum):
    """The lifecycle state of a document as it moves through ingestion.

    NEW CONCEPT: ingestion
        "Ingestion" is the pipeline that turns a raw document into searchable
        knowledge: text -> clean -> chunk -> embed -> store. A document moves
        through these states while that happens.

    Using an Enum (a fixed set of allowed values) prevents typos like
    "complate" — only these exact strings are valid.

    Why we need `FAILED` (Requirement 9.6):
        If embedding or storing fails partway through, we mark the document
        FAILED instead of leaving it half-ingested. Later, vector search can
        exclude anything that is not COMPLETED, so broken documents never leak
        into answers.
    """

    PENDING = "pending"      # created, not yet processed
    COMPLETED = "completed"  # fully chunked, embedded, and stored — safe to search
    FAILED = "failed"        # something went wrong — exclude from search


class KnowledgeDocument(BaseModel):
    """One source document in our knowledge base.

    This is the "parent" record. The actual searchable text lives in its
    KnowledgeChunk children (see below), which point back here via
    `document_id`.

    `id` is optional because a brand-new document has no database id yet —
    MongoDB assigns one when we insert it. After insertion we fill this in with
    the stringified version of MongoDB's `_id` (same pattern as Conversation).
    """

    id: str | None = None
    title: str
    source: str
    status: IngestionStatus = IngestionStatus.PENDING
    error: str | None = None  # human-readable reason when status is FAILED (Req 9.6)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class KnowledgeChunk(BaseModel):
    """A single searchable slice of a KnowledgeDocument.

    `document_id` ties this chunk back to its parent KnowledgeDocument — like a
    foreign key, so we always know where a snippet came from.

    NEW CONCEPT: embedding
        An *embedding* is a list of numbers (a vector) that captures the
        *meaning* of the text. Texts with similar meaning get similar vectors.
        At question time we embed the user's question the same way and find the
        chunks whose vectors are closest — that is "vector search". The embedding
        is created by the embedding provider (see app/ai/rag/embeddings/).

    `embedding` is a plain list of floats here. It may be empty right after a
    chunk is first created and gets filled in once the embedding step runs.

    `chunk_index` records this chunk's position (0, 1, 2, ...) within its
    document, so we can keep the original order if we ever need to.
    """

    id: str | None = None
    document_id: str
    text: str
    embedding: list[float] = Field(default_factory=list)
    chunk_index: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
