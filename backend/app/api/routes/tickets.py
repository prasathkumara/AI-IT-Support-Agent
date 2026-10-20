"""Ticket API routes (employee ticket creation slice).

Same route-layer pattern as conversations.py: this file ONLY handles HTTP —
read the request, call the SERVICE, return a response. No business logic, no
database code. It imports the service, never the repository.

Endpoints (employee slice):
  POST /tickets               -> create a ticket
  GET  /tickets?employee_id=  -> list that employee's tickets
  GET  /tickets/{ticket_id}   -> fetch one ticket

Admin actions (list all, assign, resolve) are a later slice.
"""

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.ticket import TicketCreateRequest, TicketResponse
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketCreateRequest) -> TicketResponse:
    """Raise a new ticket.

    FastAPI validates the body against TicketCreateRequest first (blank subject
    or description -> a clean 422). The service generates the friendly id and
    sets status=Open; we return the created ticket. 201 means "Created".
    """
    ticket = ticket_service.create_ticket(
        requester_name=payload.requester_name,
        requester_email=payload.requester_email,
        subject=payload.subject,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
    )
    return TicketResponse(**ticket.model_dump())


@router.get("", response_model=list[TicketResponse])
def list_tickets(
    employee_id: str = Query(..., description="Email of the employee whose tickets to list."),
) -> list[TicketResponse]:
    """List one employee's tickets, newest first.

    `employee_id` is required for this employee slice (it is the requester's
    email). The admin "list ALL tickets" view will be added as a separate slice.
    """
    tickets = ticket_service.list_employee_tickets(employee_id)
    return [TicketResponse(**t.model_dump()) for t in tickets]


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: str) -> TicketResponse:
    """Fetch one ticket by its friendly id (e.g. INC-1043), or 404."""
    ticket = ticket_service.get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    return TicketResponse(**ticket.model_dump())
