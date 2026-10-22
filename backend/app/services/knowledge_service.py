"""Knowledge ingestion service (Phase 2 - RAG, Requirements 9.1, 9.2, 9.3, 9.6).

NEW CONCEPT: service layer
    A *service* holds the BUSINESS LOGIC - the ordered steps and the rules for
    getting something done. It calls the repository to read/write MongoDB and
    calls the RAG helpers to chunk/embed text, but never talks to the database
    directly in an ad-hoc way.

WHAT THIS FILE DOES - the INGESTION pipeline (Requirement 9.2):

        text  ->  clean + chunk  ->  embed each chunk  ->  store  ->  mark status

    `ingest_document(title, text)` runs that whole pipeline. It coordinates
    pieces that already exist (it does NOT re-implement them):
      - cleaning + chunking:  app/ai/rag/chunking.chunk_text
      - embeddings:           app/ai/rag/embeddings.get_embedding_provider
      - persistence:          app/repositories/knowledge_repository
      - data shapes:          app/models/knowledge (KnowledgeDocument/Chunk)

NEW CONCEPT: replace-by-title (upsert at the document level)
    The admin knowledge base stores SEPARATE documents (one per topic/guide).
    Re-uploading a file with the SAME title should UPDATE that document, not
    create a duplicate. So before ingesting, we delete any existing document
    with the same title (and its chunks), then ingest the new version fresh.
    Different titles create different documents, so the KB can hold many.
"""

from app.ai.rag.chunking import chunk_text
from app.ai.rag.embeddings import get_embedding_provider
from app.models.knowledge import IngestionStatus, KnowledgeChunk, KnowledgeDocument
from app.repositories import knowledge_repository
from app.schemas.knowledge import IngestionResultResponse

# --- Chunking defaults ------------------------------------------------------
DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 200
DEFAULT_SOURCE = "upload"


def ingest_document(title: str, text: str) -> IngestionResultResponse:
    """Run the full ingestion pipeline for one document and report the outcome.

    REPLACE-BY-TITLE: if a document with the same `title` already exists, it and
    its chunks are deleted first, so re-uploading updates that document instead
    of creating a duplicate.

    Steps:
      1. Delete any existing document with the same title (replace behaviour).
      2. Create the parent KnowledgeDocument (status PENDING) and persist it.
      3. Inside a try/except: clean + chunk, embed every chunk, save chunks,
         then mark the document COMPLETED.
      4. On ANY error: mark the document FAILED (Requirement 9.6).

    Returns an IngestionResultResponse summarising the outcome.
    """
    # --- Step 1: replace-by-title -------------------------------------------
    existing = knowledge_repository.get_document_by_title(title)
    if existing is not None and existing.id is not None:
        # Remove the old version (and its chunks) so we don't duplicate it.
        knowledge_repository.delete_document(existing.id)

    # --- Step 2: create the parent record (status PENDING) ------------------
    document = KnowledgeDocument(
        title=title,
        source=DEFAULT_SOURCE,
        status=IngestionStatus.PENDING,
    )
    created = knowledge_repository.create_document(document)
    document_id = created.id
    assert document_id is not None  # create_document always returns a saved id

    # --- Steps 3 & 4: the risky work, guarded so failures are RECORDED ------
    try:
        chunks = chunk_text(text, DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP)

        provider = get_embedding_provider()
        embeddings = provider.embed_texts(chunks)

        chunk_models = [
            KnowledgeChunk(
                document_id=document_id,
                text=chunk,
                embedding=embedding,
                chunk_index=index,
            )
            for index, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]
        knowledge_repository.save_chunks(chunk_models)

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

    except Exception as exc:  # noqa: BLE001 - we intentionally catch ALL errors
        # REQUIREMENT 9.6: mark FAILED so vector search excludes this document.
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


def list_documents() -> list[KnowledgeDocument]:
    """List all knowledge documents, newest first (admin KB page)."""
    return knowledge_repository.list_documents()


def delete_document(document_id: str) -> None:
    """Delete a document and all of its chunks from the knowledge base."""
    knowledge_repository.delete_document(document_id)
