"""Claude LLM wrapper (Phase 4).

RESPONSIBILITY (design separation rule)
    This file is the ONLY place that knows how to talk to Claude (Anthropic).
    Its single job is: given a list of messages, return Claude's reply text.
    It does NOT know about conversations, MongoDB, or the graph. That isolation
    means if we ever switch models/providers, only this file changes.

NEW CONCEPT: an LLM "message list"
    Chat models don't take one string; they take a LIST of messages, each with a
    `role` ("user" or "assistant") and `content` (the text). This lets the model
    see the whole back-and-forth so its reply has context. There is also a
    separate "system prompt" that sets the assistant's overall behaviour.
"""

from anthropic import Anthropic, AnthropicError

from app.core.config import get_settings

# The system prompt shapes how the assistant behaves for the whole conversation.
# Kept simple for Phase 4; later phases will enrich it with company policy and
# retrieved knowledge (RAG).
SYSTEM_PROMPT = (
    "You are an internal IT support assistant. Help employees troubleshoot IT "
    "issues with clear, step-by-step guidance. If you are unsure, say so."
)


def _get_client() -> Anthropic:
    """Create the Anthropic client using the API key from config.

    We build it on demand (not at import time) so the app can start even before
    a key is set — only actually calling Claude requires the key.
    """
    settings = get_settings()
    if not settings.claude_api_key:
        raise RuntimeError(
            "CLAUDE_API_KEY is not set. Add it to backend/.env to use the chat."
        )
    return Anthropic(api_key=settings.claude_api_key)


class ClaudeError(Exception):
    """Raised when a call to Claude fails.

    We define our own error type so the rest of the app can catch a clear,
    meaningful exception instead of leaking the SDK's internal errors. This
    supports returning a descriptive message to the caller (design Req 8.4/8.5).
    """


def _build_system_prompt(context: str) -> str:
    """Combine the base system prompt with any retrieved company knowledge.

    WHY this lives here (Requirement 20.3): injecting the retrieved text into
    the prompt is part of "talking to Claude", so it belongs in this file — the
    one place that owns the Claude conversation. The RAG side only FINDS the
    text; it never decides how the prompt is phrased.

    If `context` is empty (nothing relevant was retrieved), we return the base
    prompt unchanged so Claude still answers normally.
    """
    if not context or not context.strip():
        return SYSTEM_PROMPT

    # Append the retrieved knowledge as its own clearly labelled section. Telling
    # Claude where the text came from helps it prefer OUR documents over its
    # general training when answering.
    return (
        f"{SYSTEM_PROMPT}\n\n"
        "Use the following company knowledge to answer. Prefer it over general "
        "knowledge, and if it doesn't cover the question, say so:\n\n"
        f"{context}"
    )


def generate_reply(messages: list[dict[str, str]], context: str = "") -> str:
    """Send the conversation messages to Claude and return its reply text.

    `messages` is a list like:
        [{"role": "user", "content": "my vpn won't connect"}, ...]
    We return just the assistant's reply as a plain string.

    `context` is optional company knowledge retrieved by the RAG step (task 8.1).
    When provided, we weave it into the system prompt so Claude can reason over
    OUR documents. It defaults to "" so older callers (and tests) that don't do
    retrieval keep working unchanged.

    If the Claude call fails (bad model name, auth problem, network, etc.), we
    wrap it in a ClaudeError with a readable message rather than letting a raw
    SDK exception bubble up as a 500 crash.
    """
    settings = get_settings()
    client = _get_client()

    # Build the system prompt once, folding in the retrieved context if any.
    system_prompt = _build_system_prompt(context)

    try:
        # Call the Claude "messages" API. max_tokens caps the reply length.
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )
    except AnthropicError as exc:
        # Turn the SDK's error into our own, with a clear message that includes
        # the model we tried — the most common cause is a wrong model name.
        raise ClaudeError(
            f"Claude request failed (model='{settings.claude_model}'): {exc}"
        ) from exc

    # Claude returns content as a list of blocks; for plain text we join the
    # text pieces together into a single string.
    parts = [block.text for block in response.content if block.type == "text"]
    return "".join(parts).strip()
