"""Knowledge API schemas (Phase 2 â€” RAG).

NEW CONCEPT: model vs schema (and why we keep them apart)
    - A *model* (app/models/knowledge.py) is how our data looks INSIDE the app
      and the database: it includes internal details like the MongoDB id,
      ingestion status, timestamps, and the big numeric `embedding` vectors.
    - A *schema* (this file) is what crosses the API BOUNDARY: exactly what a
      client is allowed to SEND us, and exactly what we choose to SEND BACK.

    Think of the model as "what we store" and the schema as "what we promise to
    the outside world". Keeping them separate means:
      - clients can't set fields they shouldn't (id, status, timestamps),
      - we never leak internals (like raw embedding vectors) over the API,
      - we can change how we store data without breaking the public contract.

    This mirrors app/schemas/conversation.py â€” same pattern, different feature.

FastAPI uses these schemas to:
  - validate incoming JSON automatically (wrong/missing fields -> clear 422 error),
  - document the API on the /docs page,
  - serialize responses to JSON.

These two shapes support the planned `POST /knowledge` endpoint (task 10.1):
  - KnowledgeUploadRequest  -> what the client sends to ingest a document,
  - IngestionResultResponse -> what we send back after ingestion runs.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.knowledge import IngestionStatus


class KnowledgeUploadRequest(BaseModel):
    """What a client sends to add a document to the knowledge base.

    Just the raw material for ingestion: a human-readable `title` and the
    document's `text`. Everything else â€” the generated id, the ingestion
    `status`, how many chunks we create, the embeddings â€” is decided by the
    SERVER during ingestion, so the client can't (and shouldn't) set it.

    NEW CONCEPT: why text-only for now?
        Storing the ORIGINAL binary file (PDF, DOCX, ...) depends on the File
        Storage abstraction, which is a later phase. For this phase we ingest
        plain text directly, so the request carries the text itself.

    NEW CONCEPT: Field(..., min_length=...)
        `Field` lets us attach validation rules and documentation to a field.
        `min_length=1` rejects empty strings before our code ever runs, so the
        ingestion pipeline never has to deal with a blank title or empty body.
        The `...` (Ellipsis) means "this field is required".
    """

    title: str = Field(..., min_length=1, description="Human-readable name for the document.")
    text: str = Field(..., min_length=1, description="The full plain-text content to ingest.")


class IngestionResultResponse(BaseModel):
    """What we send back after a document has been ingested.

    This summarizes the OUTCOME of the ingestion pipeline
    (text -> clean -> chunk -> embed -> store) without exposing internals like
    the raw embedding vectors or every chunk's text.

    Fields:
      - document_id:  the id MongoDB assigned to the new document, so the
                      client can refer to it later.
      - title:        echoed back for convenience/confirmation.
      - status:       reuses the SAME IngestionStatus enum as the domain model,
                      so "completed"/"failed"/"pending" mean exactly one thing
                      across the whole app (no duplicate, drifting definitions).
      - chunk_count:  how many searchable chunks we created from the text â€” a
                      quick signal that ingestion actually did something.
      - error:        a human-readable reason when `status` is FAILED (Req 9.6);
                      None on success.
    """

    document_id: str
    title: str
    status: IngestionStatus
    chunk_count: int
    error: str | None = None


class KnowledgeDocumentResponse(BaseModel):
    """What we send back when listing knowledge documents (admin KB page).

    This describes a stored document WITHOUT its chunks or embeddings â€” just
    enough for the admin to see what's in the knowledge base and manage it.
    """

    id: str
    title: str
    source: str
    status: IngestionStatus
    error: str | None = None
    created_at: datetime
    updated_at: datetime

