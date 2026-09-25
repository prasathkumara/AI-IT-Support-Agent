"""Conversation API schemas (Phase 3).

NEW CONCEPT: schema (request/response shapes)
    These define what data crosses the API boundary:
      - what a client must SEND to create a conversation (the request schema),
      - what we SEND BACK (the response schema).
    They are separate from the domain model (app/models/conversation.py) on
    purpose: the client shouldn't set internal fields like id/status/timestamps,
    and we control exactly what we expose.

FastAPI uses these schemas to:
  - validate incoming JSON automatically (wrong/missing fields -> clear 422 error),
  - document the API on the /docs page,
  - serialize responses to JSON.
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.conversation import ConversationStatus, Message


class ConversationCreateRequest(BaseModel):
    """What a client sends to start a conversation.

    Only `employee_id` — everything else (id, status, timestamps) is decided by
    the server, so the client can't set them.
    """

    employee_id: str


class ConversationResponse(BaseModel):
    """What we send back to the client for a conversation."""

    id: str | None
    employee_id: str
    status: ConversationStatus
    messages: list[Message]
    created_at: datetime
    updated_at: datetime


class SendMessageRequest(BaseModel):
    """What a client sends to post a message into a conversation.

    Just the message text; the server records who sent it and when.
    """

    content: str
