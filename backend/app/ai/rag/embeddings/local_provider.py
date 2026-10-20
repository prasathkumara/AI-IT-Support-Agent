"""Local embedding provider (Phase 2).

RESPONSIBILITY
    This is a CONCRETE implementation of the `EmbeddingProvider` contract defined
    in `base.py`. Where `base.py` only promised two methods, this file actually
    DOES the work: it loads a small machine-learning model onto your own computer
    and uses it to turn text into embedding vectors.

WHY "LOCAL" (Requirements 9.2, 9.5)
    "Local" means the model runs on this machine — no external API, no API key,
    no per-call cost, works offline. Anthropic (Claude) has no embeddings API, so
    we cannot ask Claude to make embeddings. Instead we use the open-source
    `sentence-transformers` library with a small, popular model.

    Because this class inherits from `EmbeddingProvider`, the rest of the RAG code
    only ever talks to the abstract type. Swapping to a cloud provider later means
    writing a new class and changing one config value — never touching RAG logic
    (Requirement 9.5).

NEW CONCEPT: sentence-transformers / SentenceTransformer
    `sentence-transformers` is a library that wraps pre-trained language models
    whose whole job is to read a sentence and output ONE vector capturing its
    meaning. `SentenceTransformer("all-MiniLM-L6-v2")` downloads that model (the
    first time only — then it is cached on disk) and gives you an object with an
    `.encode(...)` method that produces the vectors.

NEW CONCEPT: lazy loading
    The model is a few hundred megabytes and takes a moment to load into memory.
    We do NOT want to pay that cost just because someone imported this file. "Lazy
    loading" means: don't load the model until the FIRST time it is actually
    needed, then keep it around for reuse. Here we load it on first use inside a
    private helper (`_get_model`) and cache it on `self._model`.

NEW CONCEPT: numpy array vs. plain Python list
    The model's `.encode(...)` returns a numpy array (numpy is a fast numerical
    library). numpy arrays are great for math but are NOT plain JSON-friendly
    Python objects. MongoDB and our API speak plain lists/floats, so we convert
    with `.tolist()` before returning. Our method signatures promise
    `list[list[float]]` / `list[float]`, and this conversion keeps that promise.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.ai.rag.embeddings.base import EmbeddingProvider
from app.core.config import get_settings

# NEW CONCEPT: TYPE_CHECKING import
#     `sentence-transformers` is heavy to import. We only need its type for the
#     type hint on `self._model`. `TYPE_CHECKING` is False at runtime but True
#     while a type checker reads the code, so this import happens for tooling
#     only — it does NOT force the heavy library to load when the app imports
#     this file. The real import happens lazily inside `_get_model`.
if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer


class LocalEmbeddingProvider(EmbeddingProvider):
    """Embed text locally with a `sentence-transformers` model.

    This fills in the two abstract methods declared in `EmbeddingProvider`:
    `embed_texts` (many texts at once, used during ingestion) and `embed_query`
    (one text, used during retrieval).
    """

    def __init__(self, model_name: str | None = None) -> None:
        """Remember WHICH model to use, but do not load it yet (lazy loading).

        Args:
            model_name: the sentence-transformers model to load. If omitted, we
                read `embedding_model` from config (default "all-MiniLM-L6-v2").
                Letting config decide (instead of hardcoding) is what keeps the
                provider swappable — Requirement 9.5.
        """
        # Fall back to the configured model name when the caller doesn't pass one.
        # get_settings() is cached, so this is cheap and consistent app-wide.
        self._model_name: str = model_name or get_settings().embedding_model

        # The loaded model lives here once we build it. `None` means "not loaded
        # yet". This is the cache that makes lazy loading work.
        self._model: SentenceTransformer | None = None

    def _get_model(self) -> SentenceTransformer:
        """Return the loaded model, loading it on first use (lazy loading).

        The heavy `from sentence_transformers import SentenceTransformer` happens
        HERE, not at the top of the file, so merely importing this module stays
        fast and side-effect-free. After the first call, `self._model` is set and
        every later call reuses the same in-memory model.
        """
        if self._model is None:
            # Imported inside the function on purpose (see the docstring above).
            from sentence_transformers import SentenceTransformer

            # Constructing this downloads the model the first time (then it is
            # cached on disk by the library) and loads it into memory.
            self._model = SentenceTransformer(self._model_name)
        return self._model

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Turn MANY texts into MANY embedding vectors (one per input).

        Used during INGESTION to embed every chunk of a document together, which
        is faster than one call per chunk.

        Args:
            texts: the pieces of text to embed (e.g. document chunks).

        Returns:
            A list the SAME length as `texts`, where each item is one embedding
            (a list of floats).
        """
        # `.encode` on a list returns a 2D numpy array: one row per input text.
        # `.tolist()` converts that whole 2D array into a plain list-of-lists of
        # Python floats, matching our promised return type.
        model = self._get_model()
        embeddings = model.encode(texts)
        return embeddings.tolist()

    def embed_query(self, text: str) -> list[float]:
        """Turn ONE text (the user's question) into ONE embedding vector.

        Used during RETRIEVAL: embed the question, then compare that vector
        against stored chunk vectors to find the closest matches.

        Args:
            text: a single piece of text, typically the user's question.

        Returns:
            One embedding — a flat list of floats.
        """
        # Passing a single string returns a 1D numpy array (one vector).
        # `.tolist()` turns it into a flat list[float], matching the signature.
        model = self._get_model()
        embedding = model.encode(text)
        return embedding.tolist()
