"""Ticket service — business logic for employee ticket creation.

Same service-layer idea as conversation_service.py: the rules and steps live
here, the route just handles HTTP, and the repository does the DB work. Keeping
logic here means the AI chat escalation flow, a background job, or a test could
all create tickets the same way.
"""

from app.models.ticket import Ticket, TicketCategory, TicketPriority
from app.repositories import ticket_repository


def create_ticket(
    requester_name: str,
    requester_email: str,
    subject: str,
    description: str,
    category: TicketCategory = TicketCategory.OTHER,
    priority: TicketPriority = TicketPriority.MEDIUM,
) -> Ticket:
    """Create a new OPEN ticket for an employee and return it (with its id).

    The server owns the defaults: status starts OPEN (from the model), the
    friendly id and created_at are set during persistence. The caller only
    supplies the human-entered details plus who is raising it.
    """
    ticket = Ticket(
        requester_name=requester_name,
        requester_email=requester_email,
        subject=subject,
        description=description,
        category=category,
        priority=priority,
    )
    return ticket_repository.create(ticket)


def get_ticket(ticket_id: str) -> Ticket | None:
    """Fetch a single ticket by its friendly id (or None if not found)."""
    return ticket_repository.get_by_id(ticket_id)


def list_employee_tickets(requester_email: str, limit: int = 100) -> list[Ticket]:
    """List the tickets raised by one employee, newest first."""
    return ticket_repository.list_by_employee(requester_email, limit=limit)

# ---------------------------------------------------------------------------
# Admin actions (admin ticket slice)
# ---------------------------------------------------------------------------
# These hold the BUSINESS RULES for what assigning/resolving means. The route
# just calls them; the repository just stores what we tell it. The backend
# trusts the assignee details sent by the caller (no backend admin model yet —
# that belongs to the future auth phase).

from datetime import datetime, timezone

from app.models.ticket import TicketStatus


def list_all_tickets(limit: int = 500) -> list[Ticket]:
    """List every ticket in the system, newest first (admin overview)."""
    return ticket_repository.list_all(limit=limit)


def assign_ticket(
    ticket_id: str, assignee_name: str, assignee_email: str
) -> Ticket | None:
    """Assign a ticket to an IT admin.

    RULE: assigning a ticket that is still OPEN moves it to IN_PROGRESS (work has
    started). We do NOT change the status of an already-resolved ticket. Returns
    the updated ticket, or None if the id doesn't exist.
    """
    ticket = ticket_repository.get_by_id(ticket_id)
    if ticket is None:
        return None

    patch: dict = {
        "assignee_name": assignee_name,
        "assignee_email": assignee_email,
    }
    # Only bump an OPEN ticket to IN_PROGRESS; leave RESOLVED tickets as-is.
    if ticket.status == TicketStatus.OPEN:
        patch["status"] = TicketStatus.IN_PROGRESS.value

    return ticket_repository.update(ticket_id, patch)


def resolve_ticket(
    ticket_id: str,
    resolver_name: str | None = None,
    resolver_email: str | None = None,
) -> Ticket | None:
    """Mark a ticket RESOLVED and stamp the resolved time.

    RULE: if the ticket has no assignee yet, we assign it to whoever resolved it
    (so a resolved ticket always shows who handled it). An already-resolved
    ticket is returned unchanged. Returns None if the id doesn't exist.
    """
    ticket = ticket_repository.get_by_id(ticket_id)
    if ticket is None:
        return None
    if ticket.status == TicketStatus.RESOLVED:
        return ticket  # already resolved; nothing to do

    patch: dict = {
        "status": TicketStatus.RESOLVED.value,
        "resolved_at": datetime.now(timezone.utc),
    }
    # If unassigned, credit the resolver as the assignee.
    if not ticket.assignee_email and resolver_email:
        patch["assignee_name"] = resolver_name
        patch["assignee_email"] = resolver_email

    return ticket_repository.update(ticket_id, patch)
