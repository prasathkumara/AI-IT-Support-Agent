"""Knowledge API routes (Phase 2 - RAG + admin knowledge-base management).

Same route-layer pattern as conversations.py: HTTP only - read the request,
call the SERVICE, return a response. No business logic, no DB code here.

Endpoints:
  POST   /knowledge          -> ingest a plain-TEXT document (title + text JSON)
  POST   /knowledge/upload   -> ingest an uploaded .docx FILE (admin KB page)
  GET    /knowledge          -> list all knowledge documents (admin KB page)
  DELETE /knowledge/{id}     -> delete a document and its chunks (admin KB page)

The upload endpoint extracts text from the .docx server-side (the browser can't
run python-docx), then hands the text to the same ingestion pipeline used by
POST /knowledge. Ingestion is REPLACE-BY-TITLE: re-uploading a file with the
same title updates that document instead of creating a duplicate.
"""

import io

import docx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.schemas.knowledge import (
    IngestionResultResponse,
    KnowledgeDocumentResponse,
    KnowledgeUploadRequest,
)
from app.services import knowledge_service

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.post("", response_model=IngestionResultResponse, status_code=status.HTTP_201_CREATED)
def upload_knowledge_text(payload: KnowledgeUploadRequest) -> IngestionResultResponse:
    """Ingest a plain-TEXT document (title + text as JSON).

    Kept for programmatic/text ingestion. The admin UI uses /knowledge/upload
    with a .docx file instead.
    """
    return knowledge_service.ingest_document(payload.title, payload.text)


def _extract_docx_text(raw: bytes) -> str:
    """Pull the plain text out of a .docx file's bytes.

    NEW CONCEPT: a .docx is a zip of XML, not plain text. python-docx opens it
    and gives us the paragraphs; we join them with newlines to rebuild readable
    text. We read from an in-memory buffer (io.BytesIO) so nothing touches disk.
    """
    document = docx.Document(io.BytesIO(raw))
    return "\n".join(p.text for p in document.paragraphs)


@router.post("/upload", response_model=IngestionResultResponse, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_file(
    file: UploadFile = File(..., description="A .docx document to ingest."),
    title: str | None = Form(None, description="Optional title; defaults to the file name."),
) -> IngestionResultResponse:
    """Ingest an uploaded .docx file into the knowledge base (admin).

    NEW CONCEPT: multipart file upload. Unlike JSON endpoints, this receives a
    FILE via multipart/form-data. FastAPI's UploadFile gives us the filename and
    the bytes. We only support .docx for now (per the agreed scope).

    Flow: validate extension -> read bytes -> extract text -> ingest (which is
    replace-by-title). The ingested document's title defaults to the uploaded
    file name (without .docx) if the client doesn't supply one.
    """
    filename = file.filename or "document.docx"
    if not filename.lower().endswith(".docx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .docx files are supported right now.",
        )

    raw = await file.read()
    try:
        text = _extract_docx_text(raw)
    except Exception as exc:  # noqa: BLE001 - surface a clean error to the client
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read the .docx file: {exc}",
        ) from exc

    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The document appears to be empty - no text could be extracted.",
        )

    # Title: use the provided one, else the file name without its .docx suffix.
    resolved_title = (title or "").strip() or filename[: -len(".docx")]

    return knowledge_service.ingest_document(resolved_title, text)


@router.get("", response_model=list[KnowledgeDocumentResponse])
def list_knowledge_documents() -> list[KnowledgeDocumentResponse]:
    """List every knowledge document, newest first (admin KB page)."""
    docs = knowledge_service.list_documents()
    return [KnowledgeDocumentResponse(**d.model_dump()) for d in docs]


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_document(document_id: str) -> None:
    """Delete a document and all of its chunks. 204 = success, no body."""
    knowledge_service.delete_document(document_id)
    return None
