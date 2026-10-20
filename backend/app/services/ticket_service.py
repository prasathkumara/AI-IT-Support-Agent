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
