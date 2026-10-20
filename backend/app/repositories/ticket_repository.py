"""Ticket repository — the ONLY place that talks to the `tickets` collection.

Same repository pattern as conversation_repository.py: this module knows the
collection name, the queries, and how to translate between raw MongoDB
documents and our Ticket model. Nothing else in the app queries `tickets`
directly, so if storage details change, we only touch this file.

ID DESIGN (different from conversations):
    Tickets use a friendly id like "TICKET-1" (not MongoDB's raw _id), because
    that is what the UI and employees see. We generate it here by looking at the
    highest existing ticket number and adding one. We still let MongoDB keep its
    own _id internally, but we store our friendly id in a `ticket_id` field and
    use THAT as the public id.
"""

import re
from datetime import datetime, timezone
from typing import Any

from pymongo.collection import Collection

from app.db.mongodb import get_database
from app.models.ticket import Ticket

COLLECTION_NAME = "tickets"

# Friendly ticket ids look like "TICKET-1", "TICKET-2", ... The floor is the
# number BELOW the first id we hand out, so with a floor of 0 the first ticket
# becomes TICKET-1 (floor + 1) when the collection is empty.
_ID_PREFIX = "TICKET-"
_ID_FLOOR = 0


def _collection() -> Collection:
    """Return the tickets collection from the active database.

    Looked up per call (not at import) because the DB connection opens at app
    startup, which happens AFTER this module is imported.
    """
    return get_database()[COLLECTION_NAME]


def _document_to_model(document: dict[str, Any]) -> Ticket:
    """Turn a raw MongoDB document into a typed Ticket model.

    We store the friendly id under `ticket_id` and expose it as the model's
    `id`. MongoDB's own `_id` is internal and dropped here.
    """
    document = dict(document)  # copy so we don't mutate the original
    document.pop("_id", None)
    ticket_id = document.pop("ticket_id", None)
    if ticket_id is not None:
        document["id"] = ticket_id
    return Ticket(**document)


def _next_ticket_id() -> str:
    """Generate the next friendly id, e.g. "TICKET-1".

    Strategy: find the ticket with the highest existing number and add one.
    With an empty collection and a floor of 1, the first id is TICKET-1.

    LEARNING NOTE (concurrency): this "find max + 1" approach can RACE if two
    tickets are created at the exact same instant (both read the same max).
    For this app's scale that is acceptable. To harden it later we would use a
    dedicated atomic counter document with $inc, which hands out unique numbers
    even under concurrent writes.
    """
    highest = _ID_FLOOR
    # Scan existing ticket_ids and parse their numeric part.
    for doc in _collection().find({}, {"ticket_id": 1}):
        raw = str(doc.get("ticket_id", ""))
        match = re.search(r"(\d+)", raw)
        if match:
            highest = max(highest, int(match.group(1)))
    return f"{_ID_PREFIX}{highest + 1}"


def create(ticket: Ticket) -> Ticket:
    """Insert a new ticket, generating its friendly id, and return it."""
    ticket.id = _next_ticket_id()
    # model_dump() -> plain dict for MongoDB. We store the friendly id under
    # `ticket_id` and exclude the model's `id` field name itself.
    data = ticket.model_dump(exclude={"id"})
    data["ticket_id"] = ticket.id
    _collection().insert_one(data)
    return ticket


def get_by_id(ticket_id: str) -> Ticket | None:
    """Find one ticket by its friendly id (e.g. "TICKET-1"), or None."""
    document = _collection().find_one({"ticket_id": ticket_id})
    if document is None:
        return None
    return _document_to_model(document)


def list_by_employee(requester_email: str, limit: int = 100) -> list[Ticket]:
    """Return one employee's tickets, newest first, capped by `limit`."""
    cursor = (
        _collection()
        .find({"requester_email": requester_email})
        .sort("created_at", -1)
        .limit(limit)
    )
    return [_document_to_model(doc) for doc in cursor]


def list_all(limit: int = 500) -> list[Ticket]:
    """Return EVERY ticket, newest first, capped by `limit` (admin view)."""
    cursor = _collection().find().sort("created_at", -1).limit(limit)
    return [_document_to_model(doc) for doc in cursor]


def update(ticket_id: str, patch: dict[str, Any]) -> Ticket | None:
    """Apply a partial update to a ticket and return the updated version.

    `patch` is a dict of field->value to set (e.g. {"status": "In Progress",
    "assignee_email": "..."}). We use find_one_and_update with
    return_document=AFTER so MongoDB hands back the document AS IT LOOKS after
    the update, in a single round-trip — the same pattern as the conversation
    repository's add_message.

    Returns None if no ticket has that friendly id.
    """
    from pymongo import ReturnDocument

    if not patch:
        # Nothing to change — just return the current ticket (or None).
        return get_by_id(ticket_id)

    updated = _collection().find_one_and_update(
        {"ticket_id": ticket_id},
        {"$set": patch},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        return None
    return _document_to_model(updated)
