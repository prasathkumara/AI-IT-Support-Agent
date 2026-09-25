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
    - reply: the assistant's latest reply text. The call_claude node fills this
      in; the route reads it out at the end.
    """

    messages: list[dict[str, str]]
    reply: str
