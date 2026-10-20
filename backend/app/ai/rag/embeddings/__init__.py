"""Embedding providers package (Phase 2).

An "embedding provider" turns text into embeddings (vectors of numbers). This
package defines ONE shared contract (`EmbeddingProvider` in base.py), the
concrete implementations that fulfil it (e.g. `LocalEmbeddingProvider`), and the
`get_embedding_provider()` FACTORY below that picks the right one from config.

NEW CONCEPT: factory function
    A "factory" is just a function whose job is to CREATE and return an object
    for you, deciding WHICH concrete class to build based on some input. Here the
    input is the `embedding_provider` config value. Callers elsewhere in the RAG
    code say `get_embedding_provider()` and get back "whatever config says to
    use" — they never write `LocalEmbeddingProvider()` themselves. If you know
    React, it is like a small helper that returns the right component based on a
    prop: the caller doesn't care about the branching inside.

WHY THIS MATTERS (Requirements 9.5, 10.4)
    This single function is what makes the provider swappable by configuration.
    To add Voyage AI or OpenAI later you write a new provider class and add one
    `elif` branch here — the ingestion/retrieval code that calls this factory
    never changes. The abstraction (base.py) is the contract; this factory is the
    one place that chooses an implementation.
"""

from app.ai.rag.embeddings.base import EmbeddingProvider
from app.ai.rag.embeddings.local_provider import LocalEmbeddingProvider
from app.core.config import get_settings


def get_embedding_provider() -> EmbeddingProvider:
    """Return the embedding provider selected by config.

    Reads `embedding_provider` from `get_settings()` and returns the matching
    concrete implementation. The return TYPE is the abstract `EmbeddingProvider`
    on purpose: callers only rely on the shared contract, so they keep working no
    matter which concrete provider this hands back (Requirement 9.5).

    Returns:
        An `EmbeddingProvider` instance. With the default config
        (`embedding_provider="local"`) this is a `LocalEmbeddingProvider`.

    Raises:
        ValueError: if `embedding_provider` is set to a value we don't recognise.
            We FAIL FAST with a clear message instead of silently doing nothing,
            so a config typo (e.g. "loca") is caught immediately at startup
            rather than causing a confusing crash deep inside the RAG pipeline.
    """
    # get_settings() is cached, so reading config here is cheap and consistent
    # with the rest of the app.
    provider_name = get_settings().embedding_provider

    if provider_name == "local":
        # The local sentence-transformers provider. We pass no model_name, so it
        # falls back to the configured `embedding_model` (Requirement 9.5: config
        # decides, not hardcoded values).
        return LocalEmbeddingProvider()

    # Unknown value: stop now with a helpful, specific message. Future providers
    # (e.g. "voyage", "openai") become new `elif` branches above this line.
    raise ValueError(
        f"Unknown embedding_provider: {provider_name!r}. "
        'Supported values: "local".'
    )
