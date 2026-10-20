"""Embedding provider contract (Phase 2).

RESPONSIBILITY (design separation rule)
    This file defines the ONE shared "contract" that every embedding provider
    must follow. It is a promise, not an implementation: it says "any embedding
    provider offers these two methods" without saying HOW. The concrete work
    (loading a model, calling an API) lives in separate files like
    `local_provider.py` (added in a later task).

WHY AN ABSTRACTION HERE (Requirement 9.5)
    The rest of the RAG code depends on THIS abstract type, not on a specific
    model's code. So we can swap the local sentence-transformers model for
    Voyage AI or OpenAI later by changing one config value — the RAG logic never
    changes. The abstraction is the seam that makes providers interchangeable.

NEW CONCEPT: embedding
    An embedding is a list of numbers (a vector) that captures the MEANING of a
    piece of text. Texts with similar meaning produce vectors that sit close
    together, which is exactly what makes "find the most relevant snippet"
    (vector search) possible.

NEW CONCEPT: Abstract Base Class (ABC)
    Python's `abc` module lets us declare a class where some methods are marked
    `@abstractmethod`. That marker means "every subclass MUST implement this".
    You cannot create an instance of the abstract class itself — only of a
    concrete subclass that fills in all the abstract methods. If you know
    TypeScript interfaces from React, this is the same idea: it fixes the SHAPE
    without providing the behaviour.
"""

from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """The interface every embedding provider must implement.

    Subclasses (e.g. a local sentence-transformers provider, or a cloud API
    provider) inherit from this class and provide real bodies for the two
    abstract methods below. Code elsewhere can then accept any
    `EmbeddingProvider` and not care which concrete one it got.
    """

    @abstractmethod
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Turn MANY texts into MANY embedding vectors (one per input).

        Used during INGESTION, when we embed every chunk of a document at once.
        Doing them together is usually faster than one-by-one.

        Args:
            texts: the pieces of text to embed, e.g. document chunks.

        Returns:
            A list the SAME length as `texts`. Each item is one embedding — a
            list of floats. So the return type is a list of vectors
            (list[list[float]]).
        """
        ...

    @abstractmethod
    def embed_query(self, text: str) -> list[float]:
        """Turn ONE text (the user's question) into ONE embedding vector.

        Used during RETRIEVAL: we embed the incoming question, then compare that
        vector against the stored chunk vectors to find the closest matches.

        Args:
            text: a single piece of text, typically the user's question.

        Returns:
            One embedding — a flat list of floats (list[float]).
        """
        ...
