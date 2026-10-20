"""Agent state (Phase 4).

NEW CONCEPT: LangGraph state
    The "state" is a shared object that travels through the graph. Every node
    receives the current state, and returns an update to it. Think of it as a
    clipboard passed from step to step: one node writes to it, the next node
    reads what the previous one wrote.

We use a TypedDict — a dictionary with a fixed, typed set of keys. It behaves
like a normal dict at runtime, but editors/type-checkers know which keys exist
and what types they hold.
"""

from typing import TypedDict


class AgentState(TypedDict):
    """The data that flows through the support agent graph.

    - messages: the full conversation so far, as LLM-style message dicts
      ({"role": "user"|"assistant", "content": "..."}). Nodes read this to give
      Claude context.
    - context: company knowledge retrieved from our documents (RAG), as a single
      text block. The retrieve_knowledge node fills this in BEFORE Claude runs,
      so Claude can reason over OUR docs instead of its general training. Empty
      string ("") when nothing relevant was found — Claude still answers, just
      without extra company context.
    - reply: the assistant's latest reply text. The call_claude node fills this
      in; the route reads it out at the end.

    NEW CONCEPT: why add `context` to the state (Requirement 20.3)
        The state is the shared clipboard between nodes. We add `context` so the
        retrieve step can WRITE what it found and the Claude step can READ it.
        This is exactly how we keep responsibilities separate: retrieval puts
        text on the clipboard, reasoning picks it up — neither reaches into the
        other's job.
    """

    messages: list[dict[str, str]]
    context: str
    reply: str
