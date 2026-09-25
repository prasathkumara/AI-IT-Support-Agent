"""Conversation repository (Phase 3).

NEW CONCEPT: repository layer
    This is the ONLY place in the app that talks to the MongoDB `conversations`
    collection. It knows collection names, filters, and how to translate between
    MongoDB documents (plain dicts with an `_id` ObjectId) and our Conversation
    model. Nothing else in the app queries the database directly.

WHY: if we ever change how conversations are stored, we only touch this file.
Services and routes stay untouched.

NEW CONCEPT: ObjectId
    MongoDB gives each document a unique `_id` of type ObjectId (not a string).
    We convert it to a string when reading OUT (so the API can return it), and
    convert a string back to ObjectId when querying by id.
"""

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
from pymongo.collection import Collection

from app.db.mongodb import get_database
from app.models.conversation import Conversation, Message

# The MongoDB collection name we store conversations in.
COLLECTION_NAME = "conversations"


def _collection() -> Collection:
    """Return the conversations collection from the active database.

    We look it up on each call (rather than at import time) because the DB
    connection is opened at app startup, which happens AFTER this module is
    imported.
    """
    return get_database()[COLLECTION_NAME]


def _document_to_model(document: dict[str, Any]) -> Conversation:
    """Turn a raw MongoDB document into a typed Conversation model.

    MongoDB stores the id under `_id` as an ObjectId; our model wants a string
    `id`. So we pop `_id`, stringify it, and hand the rest to the model.
    """
    document = dict(document)  # copy so we don't mutate the original
    object_id = document.pop("_id", None)
    if object_id is not None:
        document["id"] = str(object_id)
    return Conversation(**document)


def create(conversation: Conversation) -> Conversation:
    """Insert a new conversation and return it with its generated id."""
    # model_dump() converts the Pydantic model to a plain dict MongoDB can store.
    # We exclude "id" because MongoDB creates the real id (`_id`) itself.
    data = conversation.model_dump(exclude={"id"})
    result = _collection().insert_one(data)
    # insert_one returns the new _id; put its string form on the model we return.
    conversation.id = str(result.inserted_id)
    return conversation


def get_by_id(conversation_id: str) -> Conversation | None:
    """Find one conversation by its id, or None if not found / bad id."""
    try:
        object_id = ObjectId(conversation_id)
    except (InvalidId, TypeError):
        # The given id isn't a valid MongoDB id, so it can't match anything.
        return None
    document = _collection().find_one({"_id": object_id})
    if document is None:
        return None
    return _document_to_model(document)


def list_all(limit: int = 50) -> list[Conversation]:
    """Return recent conversations, newest first, capped by `limit`."""
    cursor = _collection().find().sort("created_at", -1).limit(limit)
    return [_document_to_model(doc) for doc in cursor]


def add_message(conversation_id: str, message: Message) -> Conversation | None:
    """Append one message to a conversation and bump its updated_at time.

    Returns the updated conversation, or None if the id is invalid / not found.

    NEW CONCEPT: MongoDB update operators.
      - $push adds an item to an array field ("messages").
      - $set overwrites a field ("updated_at").
    We use find_one_and_update with return_document=AFTER so MongoDB hands back
    the document AS IT LOOKS after the update, in a single round-trip.
    """
    try:
        object_id = ObjectId(conversation_id)
    except (InvalidId, TypeError):
        return None

    updated = _collection().find_one_and_update(
        {"_id": object_id},
        {
            "$push": {"messages": message.model_dump()},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        return None
    return _document_to_model(updated)
