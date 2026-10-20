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

from pydantic import BaseModel, computed_field

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

    # NEW CONCEPT: computed_field.
    # Instead of a plain field that callers must pass in, this is DERIVED from
    # the data we already have (`messages`). Pydantic runs this method when it
    # serializes the response, so it always appears in the JSON output and on
    # the /docs page — but no route has to supply it. That means we can't ever
    # forget to set it, and we can't get the "field required / missing" error.
    @computed_field  # type: ignore[prop-decorator]
    @property
    def message_count(self) -> int:
        """How many messages this conversation currently has."""
        return len(self.messages)


class SendMessageRequest(BaseModel):
    """What a client sends to post a message into a conversation.

    Just the message text; the server records who sent it and when.
    """

    content: str
