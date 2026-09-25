"""Conversation API routes (Phase 3).

NEW CONCEPT: the route layer (the "waiter")
    A route's ONLY job is HTTP: read the incoming request, call a service to do
    the real work, and return a response. It contains no business logic and no
    database code. Notice this file imports the SERVICE, never the repository or
    MongoDB directly — that's the layering (route -> service -> repository).

These endpoints:
  POST /conversations        -> create a new conversation
  GET  /conversations        -> list recent conversations
  GET  /conversations/{id}   -> fetch one conversation by id
"""

from fastapi import APIRouter, HTTPException, status

from app.ai.llm.claude import ClaudeError
from app.schemas.conversation import (
    ConversationCreateRequest,
    ConversationResponse,
    SendMessageRequest,
)
from app.services import conversation_service

# prefix="/conversations" means every route below starts with /conversations,
# so we don't repeat it. tags groups them nicely on the /docs page.
router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(payload: ConversationCreateRequest) -> ConversationResponse:
    """Create a new conversation.

    FastAPI automatically parses the JSON body into `payload` and validates it
    against ConversationCreateRequest. `status_code=201` means "Created".
    """
    conversation = conversation_service.create_conversation(payload.employee_id)
    # FastAPI converts our Conversation model into the ConversationResponse shape.
    return ConversationResponse(**conversation.model_dump())


@router.get("", response_model=list[ConversationResponse])
def list_conversations() -> list[ConversationResponse]:
    """List recent conversations, newest first."""
    conversations = conversation_service.list_conversations()
    return [ConversationResponse(**c.model_dump()) for c in conversations]


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: str) -> ConversationResponse:
    """Fetch one conversation by id.

    NEW CONCEPT: path parameter. The `{conversation_id}` in the URL is captured
    and passed to the function argument of the same name. If nothing matches, we
    raise a 404 (Not Found) — the standard HTTP way to say "no such resource".
    """
    conversation = conversation_service.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return ConversationResponse(**conversation.model_dump())


@router.post("/{conversation_id}/messages", response_model=ConversationResponse)
def send_message(
    conversation_id: str, payload: SendMessageRequest
) -> ConversationResponse:
    """Send a message to the AI and get the updated conversation back.

    This is the chat endpoint: it saves the employee's message, runs the
    LangGraph agent (which calls Claude), saves the reply, and returns the whole
    conversation including both new messages. The last message will be the AI's
    answer.
    """
    try:
        conversation = conversation_service.send_message(
            conversation_id, payload.content
        )
    except ClaudeError as exc:
        # The AI call failed (e.g. bad model name). Return a clean, readable
        # error (502 = the upstream service we depend on failed) instead of a
        # raw 500 traceback. Note: the user's message was already saved.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return ConversationResponse(**conversation.model_dump())
