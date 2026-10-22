"""The support agent graph (Phase 4).

RESPONSIBILITY (design separation rule)
    This file owns ORCHESTRATION only: what steps exist and in what order. It
    does NOT contain the Claude API details (those live in app/ai/llm/claude.py).
    The node here just *calls* the Claude wrapper.

NEW CONCEPTS
    - Node: one step in the workflow. A node is a function that takes the state
      and returns a dict of updates to merge into the state.
    - Edge: a connection between steps. START -> retrieve_knowledge -> call_claude
      -> END means "begin, find relevant knowledge, then let Claude answer, then
      finish."
    - Compile: LangGraph turns our node+edge definition into a runnable object
      (like compiling a recipe into something you can actually execute).

THE FLOW (Phase 2 RAG, task 8.1)
    The graph now has TWO nodes in a line - this is the classic RAG shape:

        START -> retrieve_knowledge -> call_claude -> END
                 (RAG: FIND text)      (Claude: REASON)

    WHY two separate nodes instead of one that does both (Requirement 20.3):
    retrieval and reasoning are different jobs. The retrieve node only looks up
    the most relevant company text; the Claude node only writes the answer. The
    state's `context` field is the hand-off between them. Keeping them apart
    means we can change the retriever (e.g. a new embedding model) or the LLM
    independently, and each node stays small and easy to test.

DEBUG PRINTS (added for RAG visibility)
    The print(...) lines below are a simple observability aid: they show, in the
    server console, exactly what the vector search returned and what context
    string gets handed to Claude. They do NOT change behaviour. Remove them (or
    swap to the logging module) once you no longer need the visibility -- a
    backup of the original file is saved as graph.py.bak.
"""

from langgraph.graph import END, START, StateGraph

from app.ai.agent.state import AgentState
from app.ai.llm import claude
from app.ai.rag.retrieval import retrieve


def retrieve_knowledge(state: AgentState) -> dict[str, str]:
    """Node: find company knowledge relevant to the user's latest question."""
    # STEP 1 - find the latest user message to use as the search query.
    query = ""
    for message in reversed(state["messages"]):
        if message.get("role") == "user":
            query = message.get("content", "")
            break

    if not query:
        print("\n[RAG] No user message found - skipping retrieval (context empty).")
        return {"context": ""}

    # STEP 2 - retrieve the most relevant chunks via vector search.
    chunks = retrieve(query)

    # --- DEBUG: show what the vector search returned ------------------------
    print("\n" + "=" * 70)
    print(f"[RAG] Query sent to vector search: {query!r}")
    print(f"[RAG] Chunks retrieved from MongoDB: {len(chunks)}")
    for i, chunk in enumerate(chunks):
        preview = chunk.text.strip().replace("\n", " ")[:200]
        print(f"[RAG]   chunk {i} (doc chunk_index={chunk.chunk_index}): {preview}...")
    if not chunks:
        print("[RAG]   (no chunks matched - GROUNDED-ONLY: will return the no-knowledge reply, Claude NOT called)")
    print("=" * 70)

    # STEP 3 - join chunk texts into one context block for Claude.
    context = "\n\n".join(chunk.text for chunk in chunks)
    return {"context": context}


# Shown when retrieval found no relevant company knowledge. In GROUNDED-ONLY
# mode we do NOT let Claude answer from general knowledge; we say we don't have
# it and point the employee to raise a ticket for IT.
NO_KNOWLEDGE_REPLY = (
    "I couldn't find anything about that in our IT knowledge base, so I don't "
    "have an approved answer for it. If this is still an issue, let me know and "
    "I can raise a ticket so the IT team can help you directly."
)


def call_claude(state: AgentState) -> dict[str, str]:
    """Node: answer the employee, GROUNDED ONLY in retrieved company knowledge.

    HARD GUARD (grounded-only mode): if retrieval returned nothing (context is
    empty), we do NOT call Claude at all. Instead we return a fixed message that
    says we have no approved answer and offers a ticket. This guarantees the AI
    never answers IT questions from general training knowledge - it can only
    speak from OUR documents.
    """
    context = state.get("context", "")

    # --- DEBUG: show the exact context string handed to Claude --------------
    print("\n[RAG] ----- CONTEXT PASSED TO CLAUDE -----")
    if context.strip():
        print(context)
    else:
        print("(empty - GROUNDED-ONLY mode: skipping Claude, returning no-knowledge reply)")
    print("[RAG] ----- END CONTEXT -----\n")

    # Hard guard: no context -> no Claude call, fixed grounded-refusal reply.
    if not context.strip():
        return {"reply": NO_KNOWLEDGE_REPLY}

    reply_text = claude.generate_reply(state["messages"], context=context)
    return {"reply": reply_text}


def build_graph():
    """Assemble and compile the agent graph: START -> retrieve -> claude -> END."""
    builder = StateGraph(AgentState)
    builder.add_node("retrieve_knowledge", retrieve_knowledge)
    builder.add_node("call_claude", call_claude)
    builder.add_edge(START, "retrieve_knowledge")
    builder.add_edge("retrieve_knowledge", "call_claude")
    builder.add_edge("call_claude", END)
    return builder.compile()


# Build the graph once at import time and reuse it.
support_agent = build_graph()


def run_agent(messages: list[dict[str, str]]) -> str:
    """Run the agent for a given message history and return Claude's reply."""
    initial_state: AgentState = {"messages": messages, "context": "", "reply": ""}
    final_state = support_agent.invoke(initial_state)
    return final_state["reply"]
