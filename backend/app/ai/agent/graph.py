"""The support agent graph (Phase 4).

RESPONSIBILITY (design separation rule)
    This file owns ORCHESTRATION only: what steps exist and in what order. It
    does NOT contain the Claude API details (those live in app/ai/llm/claude.py).
    The node here just *calls* the Claude wrapper.

NEW CONCEPTS
    - Node: one step in the workflow. A node is a function that takes the state
      and returns a dict of updates to merge into the state.
    - Edge: a connection between steps. START -> call_claude -> END means "begin,
      run the call_claude node, then finish."
    - Compile: LangGraph turns our node+edge definition into a runnable object
      (like compiling a recipe into something you can actually execute).

Right now the graph has a single node. The value is the STRUCTURE: later phases
add nodes (retrieve knowledge, check if resolved, create ticket) and conditional
edges, without rewriting the pieces we already have.
"""

from langgraph.graph import END, START, StateGraph

from app.ai.agent.state import AgentState
from app.ai.llm import claude


def call_claude(state: AgentState) -> dict[str, str]:
    """Node: send the conversation to Claude and capture the reply.

    Reads `messages` from the state, asks the Claude wrapper for a reply, and
    returns an update that sets `reply`. LangGraph merges this returned dict
    into the state.
    """
    reply_text = claude.generate_reply(state["messages"])
    return {"reply": reply_text}


def build_graph():
    """Assemble and compile the agent graph.

    Steps:
      1. Create a StateGraph bound to our AgentState shape.
      2. Add the call_claude node.
      3. Wire the edges: START -> call_claude -> END.
      4. Compile into a runnable graph.
    """
    builder = StateGraph(AgentState)
    builder.add_node("call_claude", call_claude)
    builder.add_edge(START, "call_claude")
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
    initial_state: AgentState = {"messages": messages, "reply": ""}
    final_state = support_agent.invoke(initial_state)
    return final_state["reply"]
