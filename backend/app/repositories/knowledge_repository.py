"""Knowledge repository (Phase 2 — RAG).

NEW CONCEPT: repository layer
    This is the ONLY place in the app that talks to the two MongoDB knowledge
    collections — `knowledge_documents` (the parent records) and
    `knowledge_chunks` (the searchable slices). It knows the collection names,
    the queries, and how to translate between raw MongoDB documents (plain dicts
    with an `_id` ObjectId) and our typed KnowledgeDocument / KnowledgeChunk
    models. Nothing else in the app queries these collections directly.

WHY: if we ever change how knowledge is stored (collection names, index, the
vector search syntax), we only touch this file. The ingestion service and the
retrieval function stay untouched. This mirrors conversation_repository.py.

NEW CONCEPT: ObjectId (same as in conversation_repository.py)
    MongoDB gives each document a unique `_id` of type ObjectId (not a string).
    We convert it to a string when reading OUT (so the rest of the app and the
    API can use it), and convert a string back to ObjectId when querying by id.
"""

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
from pymongo.collection import Collection

from app.db.mongodb import get_database
from app.models.knowledge import IngestionStatus, KnowledgeChunk, KnowledgeDocument

# The two MongoDB collection names this repository owns.
# One collection for the parent documents, one for their text chunks.
DOCUMENTS_COLLECTION_NAME = "knowledge_documents"
CHUNKS_COLLECTION_NAME = "knowledge_chunks"

# NEW CONCEPT: Atlas Vector Search index name
#   Vector search in MongoDB Atlas runs against a special index you create ONCE
#   in Atlas (outside Python — see task 9.1). The pipeline below refers to that
#   index by name, so this constant must match the index you create in Atlas.
VECTOR_INDEX_NAME = "knowledge_vector_index"


def _documents() -> Collection:
    """Return the `knowledge_documents` collection from the active database.

    We look it up on each call (rather than at import time) because the DB
    connection is opened at app startup, which happens AFTER this module is
    imported.
    """
    return get_database()[DOCUMENTS_COLLECTION_NAME]


def _chunks() -> Collection:
    """Return the `knowledge_chunks` collection from the active database."""
    return get_database()[CHUNKS_COLLECTION_NAME]


def _document_to_model(document: dict[str, Any]) -> KnowledgeDocument:
    """Turn a raw MongoDB document into a typed KnowledgeDocument model.

    MongoDB stores the id under `_id` as an ObjectId; our model wants a string
    `id`. So we pop `_id`, stringify it, and hand the rest to the model.
    """
    document = dict(document)  # copy so we don't mutate the original
    object_id = document.pop("_id", None)
    if object_id is not None:
        document["id"] = str(object_id)
    return KnowledgeDocument(**document)


def _chunk_to_model(chunk: dict[str, Any]) -> KnowledgeChunk:
    """Turn a raw MongoDB document into a typed KnowledgeChunk model.

    Same `_id` -> string `id` translation as `_document_to_model`, just for the
    chunk shape.
    """
    chunk = dict(chunk)  # copy so we don't mutate the original
    object_id = chunk.pop("_id", None)
    if object_id is not None:
        chunk["id"] = str(object_id)
    return KnowledgeChunk(**chunk)


def create_document(document: KnowledgeDocument) -> KnowledgeDocument:
    """Insert a new knowledge document and return it with its generated id.

    This is the "parent" record created at the START of ingestion (usually with
    status PENDING). Its chunks are saved separately via `save_chunks`.
    """
    # model_dump() converts the Pydantic model to a plain dict MongoDB can store.
    # We exclude "id" because MongoDB creates the real id (`_id`) itself.
    data = document.model_dump(exclude={"id"})
    result = _documents().insert_one(data)
    # insert_one returns the new _id; put its string form on the model we return.
    document.id = str(result.inserted_id)
    return document


def save_chunks(chunks: list[KnowledgeChunk]) -> list[KnowledgeChunk]:
    """Insert many chunks at once and return them with their generated ids.

    NEW CONCEPT: insert_many
        Inserting one row at a time would mean one database round-trip per
        chunk. `insert_many` sends them all in a single round-trip, which is
        much faster when a document produces dozens of chunks. MongoDB returns
        the new `_id`s in the SAME ORDER we sent the chunks, so we can match
        each generated id back to its chunk by index.
    """
    if not chunks:
        # Nothing to insert — insert_many([]) would raise, so short-circuit.
        return []

    # Build the plain dicts to store, excluding "id" (MongoDB assigns `_id`).
    data = [chunk.model_dump(exclude={"id"}) for chunk in chunks]
    result = _chunks().insert_many(data)

    # inserted_ids come back in the same order as `data`; stamp each chunk.
    for chunk, inserted_id in zip(chunks, result.inserted_ids):
        chunk.id = str(inserted_id)
    return chunks


def update_document_status(
    document_id: str,
    status: IngestionStatus,
    error: str | None = None,
) -> KnowledgeDocument | None:
    """Set a document's ingestion status (and optional error) and bump updated_at.

    Returns the updated document, or None if the id is invalid / not found.

    This is how ingestion records success (status=COMPLETED) or failure
    (status=FAILED with an `error` message). Marking FAILED is what lets vector
    search later EXCLUDE broken documents (Requirement 9.6).

    NEW CONCEPT: MongoDB $set operator
        `$set` overwrites specific fields on a document without touching the
        rest. We also use find_one_and_update with return_document=AFTER so
        MongoDB hands back the document AS IT LOOKS after the update, in a
        single round-trip — the same pattern as add_message in the conversation
        repository.
    """
    try:
        object_id = ObjectId(document_id)
    except (InvalidId, TypeError):
        # The given id isn't a valid MongoDB id, so it can't match anything.
        return None

    # `status` is an IngestionStatus enum; `.value` stores the plain string
    # ("completed"/"failed"/...) so what we read back matches on comparisons.
    updated = _documents().find_one_and_update(
        {"_id": object_id},
        {
            "$set": {
                "status": status.value,
                "error": error,
                "updated_at": datetime.now(timezone.utc),
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        return None
    return _document_to_model(updated)


def vector_search(query_embedding: list[float], limit: int) -> list[KnowledgeChunk]:
    """Find the chunks whose meaning is closest to `query_embedding`.

    This is the RETRIEVAL half of RAG: we already turned the user's question
    into an embedding (a list of floats); here we ask MongoDB Atlas for the
    `limit` chunks whose stored embeddings are most similar.

    NEW CONCEPT: $vectorSearch
        `$vectorSearch` is a MongoDB Atlas stage that compares your query vector
        against the vectors stored in a field (here `embedding`) using a special
        vector index. It returns the nearest matches ranked by similarity. It is
        NOT a normal find() — it only works against the Atlas vector index named
        by `VECTOR_INDEX_NAME`, which must be created once in Atlas (task 9.1).

    NEW CONCEPT: aggregation pipeline
        An aggregation pipeline is a list of "stages" that each transform the
        data and pass the result to the next stage, like a conveyor belt. Here
        the belt is: find nearest chunks -> look up each chunk's parent document
        -> keep only chunks whose parent is COMPLETED -> drop the helper fields.

    REQUIREMENT 9.6 — exclude FAILED documents:
        A chunk might belong to a document whose ingestion later FAILED (or is
        still PENDING). We must never return those, or broken/incomplete content
        could leak into answers. We enforce this by joining each chunk to its
        parent document ($lookup) and keeping only chunks whose parent status is
        exactly "completed".
    """
    if limit <= 0:
        return []

    # NEW CONCEPT: numCandidates
    #   Atlas first gathers a wider pool of approximate candidates, then returns
    #   the best `limit` of them. A larger pool improves accuracy at some cost.
    #   A common rule of thumb is ~10x the number you ultimately want; we also
    #   keep a sensible floor so tiny limits still search a reasonable pool.
    num_candidates = max(limit * 10, 100)

    pipeline: list[dict[str, Any]] = [
        {
            # Stage 1: the actual vector similarity search.
            "$vectorSearch": {
                "index": VECTOR_INDEX_NAME,
                "path": "embedding",            # the field holding each chunk's vector
                "queryVector": query_embedding,  # the question's embedding
                "numCandidates": num_candidates,
                # We ask for extra matches here because the next stages may drop
                # some (chunks whose parent document is not COMPLETED). Fetching
                # a bit more up front means we can still return `limit` good ones.
                "limit": num_candidates,
            }
        },
        {
            # NEW CONCEPT: $lookup (a "join")
            #   MongoDB usually keeps data in one collection, but $lookup lets us
            #   pull in matching records from ANOTHER collection. Here we join each
            #   chunk to its parent in `knowledge_documents` so we can check the
            #   parent's status. The matched parent(s) land in a new array field
            #   we call "parent_document".
            #
            #   `localField` is a STRING id on the chunk (document_id), while the
            #   parent's identity is its ObjectId `_id`. A plain field-to-field
            #   $lookup would compare a string to an ObjectId and never match, so
            #   we use the pipeline form of $lookup and convert the parent `_id`
            #   to a string with $toString before comparing.
            "$lookup": {
                "from": DOCUMENTS_COLLECTION_NAME,
                "let": {"doc_id": "$document_id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$eq": [{"$toString": "$_id"}, "$$doc_id"],
                            }
                        }
                    }
                ],
                "as": "parent_document",
            }
        },
        {
            # Stage 3: keep only chunks whose parent document is COMPLETED.
            # This is the Requirement 9.6 exclusion. `parent_document` is the
            # array produced by $lookup; `.status` reads the status of its single
            # matched parent. Chunks whose parent is PENDING, FAILED, or missing
            # are filtered out here and never returned.
            "$match": {
                "parent_document.status": IngestionStatus.COMPLETED.value,
            }
        },
        {
            # Stage 4: trim the result back to the number the caller asked for,
            # now that the exclusion above may have removed some matches.
            "$limit": limit,
        },
        {
            # NEW CONCEPT: $project
            #   $project chooses which fields to keep or drop. We drop the helper
            #   `parent_document` array (we only needed it for the status check)
            #   so the result matches the plain chunk shape our model expects.
            "$project": {
                "parent_document": 0,
            }
        },
    ]

    cursor = _chunks().aggregate(pipeline)
    return [_chunk_to_model(doc) for doc in cursor]


def list_documents(limit: int = 200) -> list[KnowledgeDocument]:
    """Return all knowledge documents, newest first (for the admin KB page)."""
    cursor = _documents().find().sort("created_at", -1).limit(limit)
    return [_document_to_model(doc) for doc in cursor]


def get_document_by_title(title: str) -> KnowledgeDocument | None:
    """Find a document by its exact title, or None.

    Used for the REPLACE-BY-TITLE behaviour: before ingesting, we check whether
    a document with the same title already exists so we can replace it.
    """
    document = _documents().find_one({"title": title})
    if document is None:
        return None
    return _document_to_model(document)


def delete_document(document_id: str) -> int:
    """Delete a document AND all of its chunks. Returns chunks removed count.

    We delete the chunks first (they reference the document via `document_id`),
    then the parent document. `document_id` is the stringified `_id`.
    """
    # Remove every chunk that belongs to this document.
    chunk_result = _chunks().delete_many({"document_id": document_id})
    # Remove the parent document itself.
    try:
        object_id = ObjectId(document_id)
    except (InvalidId, TypeError):
        return chunk_result.deleted_count
    _documents().delete_one({"_id": object_id})
    return chunk_result.deleted_count
