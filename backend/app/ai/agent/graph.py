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
    The graph now has TWO nodes in a line — this is the classic RAG shape:

        START -> retrieve_knowledge -> call_claude -> END
                 (RAG: FIND text)      (Claude: REASON)

    WHY two separate nodes instead of one that does both (Requirement 20.3):
    retrieval and reasoning are different jobs. The retrieve node only looks up
    the most relevant company text; the Claude node only writes the answer. The
    state's `context` field is the hand-off between them. Keeping them apart
    means we can change the retriever (e.g. a new embedding model) or the LLM
    independently, and each node stays small and easy to test. If you know
    React: it's like a data-fetching hook feeding a presentational component —
    one gets the data, the other renders it.

Later phases keep extending this same structure (check if resolved, create
ticket, conditional edges) without rewriting the pieces we already have.
"""

from langgraph.graph import END, START, StateGraph

from app.ai.agent.state import AgentState
from app.ai.llm import claude
from app.ai.rag.retrieval import retrieve


def retrieve_knowledge(state: AgentState) -> dict[str, str]:
    """Node: find company knowledge relevant to the user's latest question.

    This is the RAG half of the flow (Requirement 7.3). It runs BEFORE Claude so
    the reply can be grounded in OUR documents. Its ONLY job is to FIND text and
    put it on the state's `context` field — it never writes an answer. That's
    the retrieve/reason separation (Requirement 20.3).

    Steps:
      1. Find the latest user message to use as the search query.
      2. Ask the RAG retriever for the most relevant chunks.
      3. Join those chunks' text into one context block.
      4. Return {"context": ...} for LangGraph to merge into the state.
    """
    # STEP 1 — find the query. The conversation can end with an assistant turn,
    # so we scan BACKWARDS for the most recent message whose role is "user".
    # reversed() walks the list from the end; we take the first user one.
    query = ""
    for message in reversed(state["messages"]):
        if message.get("role") == "user":
            query = message.get("content", "")
            break

    # RESILIENCE: if there's no user message at all, there's nothing to search
    # for. Return empty context and let Claude answer without extra knowledge.
    if not query:
        return {"context": ""}

    # STEP 2 — retrieve. retrieve() returns the most relevant KnowledgeChunk
    # objects (or an empty list if nothing matches / the KB is empty).
    chunks = retrieve(query)

    # STEP 3 — turn the chunks into one text block. Each KnowledgeChunk exposes
    # its text via `.text`; we separate chunks with blank lines so Claude can
    # tell them apart. If `chunks` is empty, this join produces "" naturally.
    context = "\n\n".join(chunk.text for chunk in chunks)

    # STEP 4 — hand the found text to the next node via the shared state.
    return {"context": context}


def call_claude(state: AgentState) -> dict[str, str]:
    """Node: send the conversation to Claude and capture the reply.

    Reads `messages` AND the `context` that retrieve_knowledge put on the state,
    asks the Claude wrapper for a reply, and returns an update that sets `reply`.
    LangGraph merges this returned dict into the state.

    state.get("context", "") defends against context being missing — if it's not
    there we pass "", and Claude simply answers without extra company knowledge.
    """
    context = state.get("context", "")
    reply_text = claude.generate_reply(state["messages"], context=context)
    return {"reply": reply_text}


def build_graph():
    """Assemble and compile the agent graph.

    Steps:
      1. Create a StateGraph bound to our AgentState shape.
      2. Add the retrieve_knowledge and call_claude nodes.
      3. Wire the edges: START -> retrieve_knowledge -> call_claude -> END.
      4. Compile into a runnable graph.

    The edge order is what makes retrieval happen BEFORE Claude: the state flows
    through retrieve_knowledge first (filling in `context`), then call_claude
    (which reads that `context`).
    """
    builder = StateGraph(AgentState)
    builder.add_node("retrieve_knowledge", retrieve_knowledge)
    builder.add_node("call_claude", call_claude)
    builder.add_edge(START, "retrieve_knowledge")
    builder.add_edge("retrieve_knowledge", "call_claude")
    builder.add_edge("call_claude", END)
    return builder.compile()


# Build the graph once at import time and reuse it. Compiling is cheap but we
# only need to do it once.
support_agent = build_graph()


def run_agent(messages: list[dict[str, str]]) -> str:
    """Run the agent for a given message history and return Claude's reply.

    This is the simple entry point the service layer calls. It sets up the
    initial state, invokes the graph, and pulls the reply out of the final state.
    """
    # Start with empty `context` and `reply`; the retrieve_knowledge node fills
    # in context, then call_claude fills in reply.
    initial_state: AgentState = {"messages": messages, "context": "", "reply": ""}
    final_state = support_agent.invoke(initial_state)
    return final_state["reply"]
