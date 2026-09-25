"""Conversation service (Phase 3).

NEW CONCEPT: service layer
    The service holds BUSINESS LOGIC — the rules and steps for doing something.
    It calls the repository to read/write data, but never touches MongoDB
    directly. Right now the logic is simple (just create/fetch), but as the app
    grows, rules like "a conversation can't be completed twice" or "creating a
    ticket closes the conversation" will live here, not in the routes.

WHY separate from the route?
    The route's job is only to handle HTTP (read the request, return a response).
    Keeping business logic here means we could later call these same functions
    from the AI agent, a background job, or a test — not just from an HTTP route.
"""

from app.ai.agent.graph import run_agent
from app.models.conversation import Conversation, Message
from app.repositories import conversation_repository


def create_conversation(employee_id: str) -> Conversation:
    """Start a new, empty, active conversation for an employee."""
    # Build a fresh Conversation model. Status defaults to ACTIVE and messages
    # to an empty list (see the model's defaults).
    conversation = Conversation(employee_id=employee_id)
    # Hand it to the repository to persist, and return the saved version
    # (which now has an id).
    return conversation_repository.create(conversation)


def get_conversation(conversation_id: str) -> Conversation | None:
    """Fetch a single conversation by id (or None if it doesn't exist)."""
    return conversation_repository.get_by_id(conversation_id)


def list_conversations(limit: int = 50) -> list[Conversation]:
    """List recent conversations, newest first."""
    return conversation_repository.list_all(limit=limit)


def send_message(conversation_id: str, user_text: str) -> Conversation | None:
    """One chat turn: save the user's message, ask the AI, save the reply.

    This is where the data layer meets the AI layer. Steps:
      1. Load the conversation (so we have its history for context).
      2. Save the employee's new message.
      3. Build the message list and run the LangGraph agent (which calls Claude).
      4. Save the assistant's reply.
      5. Return the updated conversation (now containing both new messages).

    Returns None if the conversation doesn't exist.
    """
    conversation = conversation_repository.get_by_id(conversation_id)
    if conversation is None:
        return None

    # 2. Persist the employee's message first.
    conversation_repository.add_message(
        conversation_id, Message(role="user", content=user_text)
    )

    # 3. Build the message history in the LLM format the agent expects.
    #    We include prior messages plus the new one so Claude has full context.
    history = [
        {"role": m.role, "content": m.content} for m in conversation.messages
    ]
    history.append({"role": "user", "content": user_text})
    reply_text = run_agent(history)

    # 4. Persist the assistant's reply and return the fully-updated conversation.
    return conversation_repository.add_message(
        conversation_id, Message(role="assistant", content=reply_text)
    )
