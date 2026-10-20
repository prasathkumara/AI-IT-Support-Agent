"""RAG (Retrieval-Augmented Generation) subsystem (Phase 2).

RAG makes the AI answer from OUR OWN company documents instead of only from
Claude's general knowledge. Before Claude answers, we RETRIEVE the most relevant
snippets from stored documents and give them to Claude as extra context.

This package holds the building blocks of that pipeline (embeddings, chunking,
retrieval). Each piece is added in its own task.
"""
