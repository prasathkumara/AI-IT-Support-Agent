"""RAG retrieval (Phase 2 — Requirements 9.4, 10.2).

NEW CONCEPT: retrieval
    "Retrieval" is the question-time half of RAG. Ingestion (task 6.1) already
    stored our documents as embedded chunks in MongoDB. Retrieval does the
    reverse at the moment a user asks something:

        question -> embed -> vector search -> top chunks

    We turn the question into an embedding (a vector of numbers that captures
    its meaning), ask MongoDB Atlas for the stored chunks whose embeddings are
    closest in meaning, and hand those chunks back. That's it.

NEW CONCEPT: why RAG retrieves, then Claude reasons (Requirement 20.3)
    Notice what this function does NOT do: it does not summarize, rank by
    relevance beyond similarity, or write any answer. That is deliberate. We
    keep two jobs separate:
        - RAG's job (here): FIND the most relevant source text.
        - Claude's job (later, task 8.1): REASON over that text to write a reply.
    This "separation of responsibilities" keeps each piece small and testable,
    and lets us swap one without touching the other (e.g. change the embedding
    model, or change the LLM, independently). If you know React: it's like
    keeping a data-fetching function separate from the component that renders
    the data — each has one clear job.

HOW THIS FILE FITS TOGETHER
    This module is a COORDINATOR. It does not reimplement embeddings or the
    database query — it calls the pieces that already exist:
        - app.ai.rag.embeddings.get_embedding_provider() -> turns text into a
          vector (the embedding provider abstraction, Requirement 9.5).
        - app.repositories.knowledge_repository.vector_search() -> the only
          place that runs the Atlas $vectorSearch query (Requirement 10.2).
    Lives in app/ai/rag/retrieval.py (not knowledge_service.py) because that
    file is owned by the ingestion task; keeping retrieval separate avoids
    collisions and mirrors the ingestion/retrieval split RAG naturally has.
"""

from app.ai.rag.embeddings import get_embedding_provider
from app.models.knowledge import KnowledgeChunk
from app.repositories import knowledge_repository


def retrieve(query: str, limit: int = 5) -> list[KnowledgeChunk]:
    """Return the knowledge chunks most relevant to `query`.

    This is the public entry point for RAG retrieval. The LangGraph agent will
    call this (task 8.1) before Claude answers, so Claude can reason over OUR
    documents instead of its general training knowledge.

    Args:
        query: the user's question (plain text).
        limit: how many chunks to return at most. Defaults to 5 — a small number
            keeps the context we feed to Claude focused and within budget.

    Returns:
        A list of KnowledgeChunk, ordered most-relevant first (that ordering
        comes from the vector search). Empty if there's nothing to search for.
    """
    # EARLY RETURN for an empty / whitespace-only question.
    #
    # WHY: embedding "" (or "   ") is pointless — there's no meaning to capture,
    # and vector-searching a meaningless vector would just waste a model call and
    # a database round-trip to return noise. Handling this trivial case up front
    # keeps the real work below simple and predictable. `.strip()` removes
    # surrounding whitespace; if nothing is left, there was no real question.
    if not query or not query.strip():
        return []

    # STEP 1 — embed the question.
    # get_embedding_provider() hands back whichever provider config selected
    # (local sentence-transformers by default). embed_query turns ONE text into
    # ONE vector (list[float]) — the same kind of vector the stored chunks hold,
    # so they can be compared.
    provider = get_embedding_provider()
    query_embedding = provider.embed_query(query)

    # STEP 2 — vector search.
    # The repository is the ONLY place that talks to the knowledge collections
    # and runs the Atlas $vectorSearch. We pass the question's vector and the
    # limit; it returns the closest chunks (already excluding chunks whose parent
    # document isn't COMPLETED — Requirement 9.6).
    chunks = knowledge_repository.vector_search(query_embedding, limit)

    # STEP 3 — return the chunks as-is. No reasoning, no formatting: that's
    # Claude's job later (Requirement 20.3).
    return chunks
