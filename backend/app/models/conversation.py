"""Conversation domain model (Phase 3).

NEW CONCEPT: model vs schema
    A *model* describes how our data looks INSIDE the app and database.
    A *schema* (see app/schemas/conversation.py) describes what crosses the API
    boundary (what a client sends / what we send back). Keeping them separate
    means we can change internals without breaking the public API.

We use Pydantic models here because Pydantic gives us:
  - typed fields (catch mistakes early),
  - validation,
  - easy conversion to/from plain dicts (which is what MongoDB stores).
"""

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class ConversationStatus(str, Enum):
    """The lifecycle state of a conversation.

    Using an Enum (a fixed set of allowed values) prevents typos like
    "actve" — only these exact strings are valid.
    """

    ACTIVE = "active"
    COMPLETED = "completed"


class Message(BaseModel):
    """A single message within a conversation.

    `role` is who sent it — typically "user" (the employee) or "assistant"
    (the AI). We keep this simple for now; the AI agent will populate these
    in a later phase.
    """

    role: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Conversation(BaseModel):
    """A support conversation between an employee and the AI.

    `id` is optional because a brand-new conversation has no database id yet —
    MongoDB assigns one when we insert it. After insertion we fill this in with
    the stringified version of MongoDB's `_id`.
    """

    id: str | None = None
    employee_id: str
    status: ConversationStatus = ConversationStatus.ACTIVE
    messages: list[Message] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
