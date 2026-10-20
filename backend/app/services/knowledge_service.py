"""Knowledge ingestion service (Phase 2 — RAG, Requirements 9.1, 9.2, 9.3, 9.6).

NEW CONCEPT: service layer
    A *service* holds the BUSINESS LOGIC — the ordered steps and the rules for
    getting something done. It calls the repository to read/write MongoDB and
    calls the RAG helpers to chunk/embed text, but it never talks to the
    database or the embedding library directly in an ad-hoc way. This mirrors
    `conversation_service.py`: the route (HTTP) stays thin, and the reusable
    logic lives here so the agent, a background job, or a test could call it too.

WHAT THIS FILE DOES — the INGESTION pipeline (Requirement 9.2):

        text  ->  clean + chunk  ->  embed each chunk  ->  store  ->  mark status

    `ingest_document(title, text)` runs that whole pipeline. It coordinates
    pieces that already exist (it does NOT re-implement them):
      - cleaning + chunking:  app/ai/rag/chunking.chunk_text
      - embeddings:           app/ai/rag/embeddings.get_embedding_provider
      - persistence:          app/repositories/knowledge_repository
      - data shapes:          app/models/knowledge (KnowledgeDocument/Chunk)

NEW CONCEPT: marking failure instead of crashing (Requirement 9.6)
    Ingestion has several steps that can fail (embedding model error, a database
    hiccup, ...). If a step fails partway through, we do NOT want to leave a
    half-ingested document that vector search might return. So the whole
    chunk/embed/store sequence runs inside a try/except: on ANY error we mark the
    document FAILED (and record the error message). The repository's
    `vector_search` only returns chunks whose parent document is COMPLETED, so a
    document marked FAILED is automatically excluded from answers.
"""

from app.ai.rag.chunking import chunk_text
from app.ai.rag.embeddings import get_embedding_provider
from app.models.knowledge import IngestionStatus, KnowledgeChunk, KnowledgeDocument
from app.repositories import knowledge_repository
from app.schemas.knowledge import IngestionResultResponse

# --- Chunking defaults ------------------------------------------------------
# How big each text slice is, and how much neighbouring slices overlap. See
# app/ai/rag/chunking.py for what "chunk" and "overlap" mean.
#
# DESIGN NOTE: these live here as module constants rather than in config.
#   The config (app/core/config.py) currently models the EMBEDDING settings
#   (provider/model/dimension) but has no chunk-size keys, and adding new config
#   is outside the scope of this task. Module constants keep the sensible
#   defaults in one obvious place; promoting them to config later is a one-line
#   change (read get_settings() here instead of these constants).
#
# WHY 1000 / 200? ~1000 characters is a few paragraphs — small enough for the
# embedding model to capture a focused idea, large enough to carry real context.
# A 200-character overlap (~20%) keeps sentences that straddle a boundary intact
# in at least one chunk, so meaning isn't lost at the cut points.
DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 200

# What we record as the `source` of a document ingested through this pipeline.
# For now everything comes in as plain text via upload; storing the ORIGINAL
# binary file depends on the File Storage abstraction (a later phase).
DEFAULT_SOURCE = "upload"


def ingest_document(title: str, text: str) -> IngestionResultResponse:
    """Run the full ingestion pipeline for one document and report the outcome.

    Steps:
      1. Create the parent KnowledgeDocument with status PENDING and persist it
         so it gets a database id (chunks need that id to point back to it).
      2. Inside a try/except: clean + chunk the text, embed every chunk, build
         KnowledgeChunk records, save them, then mark the document COMPLETED.
      3. On ANY error: mark the document FAILED with the error message so vector
         search excludes it (Requirement 9.6).

    Args:
        title: Human-readable name for the document (e.g. "VPN Setup Guide").
        text:  The full plain-text content to ingest.

    Returns:
        An IngestionResultResponse summarising the outcome. On success its
        `status` is COMPLETED and `chunk_count` is how many chunks we stored. On
        failure its `status` is FAILED and `error` holds the reason.

    DESIGN NOTE — why RETURN a failed result instead of re-raising:
        The IngestionResultResponse schema already has `status` and `error`
        fields built for exactly this. Returning a populated FAILED result (not
        raising) means the future POST /knowledge route can hand the client one
        consistent response shape whether ingestion succeeded or failed, and the
        document is still safely marked FAILED in the database either way.
    """
    # --- Step 1: create the parent record FIRST (status PENDING) ------------
    # We persist the document before doing any heavy work so that:
    #   - chunks have a real `document_id` to reference, and
    #   - if a later step fails, there is already a record we can mark FAILED.
    document = KnowledgeDocument(
        title=title,
        source=DEFAULT_SOURCE,
        status=IngestionStatus.PENDING,
    )
    created = knowledge_repository.create_document(document)
    # After insertion the repository fills in the generated id. We assert it so
    # the type checker (and future readers) know it's definitely present below.
    document_id = created.id
    assert document_id is not None  # create_document always returns a saved id

    # --- Steps 2 & 3: the risky work, guarded so failures are RECORDED ------
    try:
        # 2a. Clean + chunk. chunk_text normalises whitespace then slices the
        #     text into overlapping pieces (the "clean + chunk" of Req 9.2).
        chunks = chunk_text(text, DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP)

        # 2b. Embed every chunk in ONE call. get_embedding_provider() returns the
        #     config-selected provider (local by default); embed_texts turns the
        #     list of chunk strings into a list of vectors, IN THE SAME ORDER —
        #     so embeddings[i] belongs to chunks[i].
        provider = get_embedding_provider()
        embeddings = provider.embed_texts(chunks)

        # 2c. Build a KnowledgeChunk for each (text, embedding) pair. `enumerate`
        #     gives us the position, which we store as `chunk_index` so the
        #     original order is preserved. `zip` walks the two equal-length lists
        #     together.
        chunk_models = [
            KnowledgeChunk(
                document_id=document_id,
                text=chunk,
                embedding=embedding,
                chunk_index=index,
            )
            for index, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]

        # 2d. Persist all chunks in one round-trip.
        knowledge_repository.save_chunks(chunk_models)

        # 2e. Everything worked — mark the document COMPLETED so vector search
        #     will include its chunks.
        knowledge_repository.update_document_status(
            document_id, IngestionStatus.COMPLETED
        )

        return IngestionResultResponse(
            document_id=document_id,
            title=title,
            status=IngestionStatus.COMPLETED,
            chunk_count=len(chunk_models),
            error=None,
        )

    except Exception as exc:  # noqa: BLE001 — we intentionally catch ALL errors
        # REQUIREMENT 9.6: whatever went wrong (bad embedding, DB error, ...),
        # mark the document FAILED and store a human-readable reason. Because
        # vector_search only returns chunks whose parent is COMPLETED, this
        # document is now automatically excluded from answers.
        error_message = str(exc)
        knowledge_repository.update_document_status(
            document_id, IngestionStatus.FAILED, error=error_message
        )

        return IngestionResultResponse(
            document_id=document_id,
            title=title,
            status=IngestionStatus.FAILED,
            chunk_count=0,
            error=error_message,
        )
