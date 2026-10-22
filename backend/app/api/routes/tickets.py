"""Ticket API routes.

Same route-layer pattern as conversations.py: this file ONLY handles HTTP —
read the request, call the SERVICE, return a response. No business logic, no
database code. It imports the service, never the repository.

Employee slice:
  POST /tickets                 -> create a ticket
  GET  /tickets?employee_id=    -> list that employee's tickets
  GET  /tickets/{ticket_id}     -> fetch one ticket

Admin slice:
  GET   /tickets/all            -> list EVERY ticket
  PATCH /tickets/{id}/assign    -> assign to an IT admin (Open -> In Progress)
  PATCH /tickets/{id}/resolve   -> mark resolved

ROUTE ORDER MATTERS: the literal path "/tickets/all" is declared BEFORE the
dynamic "/tickets/{ticket_id}", otherwise FastAPI would treat "all" as a
ticket id and route it to get_ticket.
"""

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.ticket import (
    TicketAssignRequest,
    TicketCreateRequest,
    TicketResolveRequest,
    TicketResponse,
    TicketStatusRequest,
)
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
    """List one employee's tickets, newest first (employee view)."""
    tickets = ticket_service.list_employee_tickets(employee_id)
    return [TicketResponse(**t.model_dump()) for t in tickets]


@router.get("/all", response_model=list[TicketResponse])
def list_all_tickets() -> list[TicketResponse]:
    """List EVERY ticket in the system, newest first (admin view).

    Declared before /{ticket_id} so "all" is not mistaken for a ticket id.
    """
    tickets = ticket_service.list_all_tickets()
    return [TicketResponse(**t.model_dump()) for t in tickets]


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: str) -> TicketResponse:
    """Fetch one ticket by its friendly id (e.g. TICKET-1), or 404."""
    ticket = ticket_service.get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    return TicketResponse(**ticket.model_dump())


@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
def assign_ticket(ticket_id: str, payload: TicketAssignRequest) -> TicketResponse:
    """Assign a ticket to an IT admin. An Open ticket moves to In Progress.

    PATCH = partially update an existing resource (we only change assignee +
    status, not the whole ticket). Returns the updated ticket, or 404.
    """
    ticket = ticket_service.assign_ticket(
        ticket_id, payload.assignee_name, payload.assignee_email
    )
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    return TicketResponse(**ticket.model_dump())


@router.patch("/{ticket_id}/resolve", response_model=TicketResponse)
def resolve_ticket(ticket_id: str, payload: TicketResolveRequest) -> TicketResponse:
    """Mark a ticket resolved. If unassigned, the resolver becomes the assignee.

    Returns the updated ticket, or 404 if the id doesn't exist.
    """
    ticket = ticket_service.resolve_ticket(
        ticket_id, payload.resolver_name, payload.resolver_email
    )
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    return TicketResponse(**ticket.model_dump())



@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def set_ticket_status(ticket_id: str, payload: TicketStatusRequest) -> TicketResponse:
    """Set a ticket to any status (Open / In Progress / Resolved / Closed).

    Free transitions - the admin dropdown can move a ticket to any status. The
    service stamps resolved_at when moving into Resolved/Closed and clears it
    when moving back to an active state. Returns the updated ticket, or 404.
    """
    ticket = ticket_service.set_status(ticket_id, payload.status)
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    return TicketResponse(**ticket.model_dump())
