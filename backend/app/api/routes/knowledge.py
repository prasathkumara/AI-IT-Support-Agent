"""Knowledge API routes (Phase 2 — RAG, Requirements 9.1, 9.2).

NEW CONCEPT: the route layer (the "waiter"), again
    Just like conversations.py, this file's ONLY job is HTTP: read the incoming
    request, call a SERVICE to do the real work, and return a response. There is
    no business logic and no database code here. Notice we import the ingestion
    SERVICE (app.services.knowledge_service), never the repository or MongoDB
    directly — that's the layering again: route -> service -> repository.

NEW CONCEPT: model vs schema (where each one belongs)
    - A *model* (app/models/knowledge.py) is how data looks INSIDE the app and
      the database (internal id, status, timestamps, raw embedding vectors).
    - A *schema* (app/schemas/knowledge.py) is what crosses the API BOUNDARY:
      exactly what a client may SEND and exactly what we promise to SEND BACK.
    This route only ever touches SCHEMAS. It accepts a KnowledgeUploadRequest
    and returns an IngestionResultResponse, so internals never leak over HTTP.

This endpoint:
  POST /knowledge   -> ingest a plain-text document into the knowledge base
"""

from fastapi import APIRouter, status

from app.schemas.knowledge import IngestionResultResponse, KnowledgeUploadRequest
from app.services import knowledge_service

# prefix="/knowledge" means every route below starts with /knowledge, so the
# route decorator can use "" to mean the full path /knowledge. tags groups this
# endpoint on the /docs page. Same pattern as conversations.py.
router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.post("", response_model=IngestionResultResponse, status_code=status.HTTP_201_CREATED)
def upload_knowledge(payload: KnowledgeUploadRequest) -> IngestionResultResponse:
    """Ingest a plain-text document into the knowledge base.

    FastAPI parses the JSON body into `payload` and validates it against
    KnowledgeUploadRequest first (missing/empty title or text -> a clean 422
    before our code even runs). `status_code=201` means "Created".

    We hand the title + text straight to the ingestion service, which runs the
    whole pipeline (clean -> chunk -> embed -> store -> mark status) and returns
    an IngestionResultResponse summarising the outcome.

    NEW CONCEPT: the service RETURNS failure instead of raising it
        Ingestion can fail partway (bad embedding model, DB hiccup). Rather than
        throwing, `ingest_document` catches the error, marks the document FAILED
        in the database, and returns an IngestionResultResponse whose `status` is
        FAILED and whose `error` explains why. So on the HTTP side there's
        nothing to catch here — we return the result as-is, and the client reads
        `status`/`error` to see what happened.

        For this phase that's deliberately simple: a 201 means "we processed your
        upload", and the body tells the client whether ingestion COMPLETED or
        FAILED. If a later phase wants a failed ingestion to be a non-2xx HTTP
        status instead, that's where we'd inspect `result.status` and raise an
        HTTPException — but keeping one consistent response shape is fine now.
    """
    result = knowledge_service.ingest_document(payload.title, payload.text)
    return result
