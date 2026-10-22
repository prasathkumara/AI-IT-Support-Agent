"""Ticket API schemas (employee ticket creation).

NEW CONCEPT: schema (request/response shapes) — same idea as conversation.py.
    - The REQUEST schema is exactly what a client may SEND to create a ticket.
      It intentionally does NOT include id/status/created_at/assignee, because
      the SERVER decides those. A client cannot (and should not) set them.
    - The RESPONSE schema is exactly what we SEND BACK, including the generated
      id, status and timestamps.

FastAPI uses these to validate incoming JSON automatically (missing/invalid
fields -> a clean 422 before our code runs), to document the API on /docs, and
to serialize responses.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.ticket import TicketCategory, TicketPriority, TicketStatus


class TicketCreateRequest(BaseModel):
    """What a client sends to raise a new ticket.

    `requester_name` / `requester_email` identify who is raising it — the
    frontend fills these from the signed-in user (until real auth exists).
    `category` and `priority` default to the same values as the model if the
    client omits them. `subject` and `description` are required and must be
    non-empty (min_length=1 rejects blank strings before our code runs).
    """

    requester_name: str = Field(..., min_length=1, description="Name of the employee raising the ticket.")
    requester_email: str = Field(..., min_length=1, description="Email of the employee raising the ticket.")
    subject: str = Field(..., min_length=1, description="Short summary of the issue.")
    description: str = Field(..., min_length=1, description="Full description of the issue.")
    category: TicketCategory = TicketCategory.OTHER
    priority: TicketPriority = TicketPriority.MEDIUM


class TicketResponse(BaseModel):
    """What we send back for a ticket — mirrors the frontend's Ticket shape.

    Reuses the SAME enums as the domain model so status/category/priority mean
    exactly one thing across the whole app.
    """

    id: str
    requester_name: str
    requester_email: str
    subject: str
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    description: str
    assignee_name: str | None = None
    assignee_email: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime


class TicketAssignRequest(BaseModel):
    """What an admin sends to assign a ticket to an IT staff member.

    The backend trusts these values (there is no backend admin model yet — that
    comes with the auth phase). The frontend fills them from its known admin
    list. Both are required and non-empty.
    """

    assignee_name: str = Field(..., min_length=1, description="Name of the IT admin to assign.")
    assignee_email: str = Field(..., min_length=1, description="Email of the IT admin to assign.")


class TicketResolveRequest(BaseModel):
    """Optional details about who resolved a ticket.

    If the ticket is unassigned, the service credits this resolver as the
    assignee. Both fields are optional — resolving without a resolver still
    works (the ticket just keeps whatever assignee it already had).
    """

    resolver_name: str | None = None
    resolver_email: str | None = None


class TicketStatusRequest(BaseModel):
    """What an admin sends to change a ticket's status (free transitions).

    `status` must be one of the TicketStatus values (Open / In Progress /
    Resolved / Closed); FastAPI rejects anything else with a 422.
    """

    status: TicketStatus
