// lib/api.ts — the single place the frontend talks to the backend.
//
// WHY THIS FILE EXISTS (same idea as the backend's repository layer):
//   Instead of scattering fetch() calls across React components, every call to
//   the backend lives here. If the API URL, shapes, or error handling change,
//   we fix ONE file. Components just call these functions and get clean data
//   back (or a clear error).
//
// It wraps two backend endpoints that together power the AI chat:
//   1. POST /conversations                   -> start a conversation, get its id
//   2. POST /conversations/{id}/messages     -> send a message, get RAG+Claude reply
//
// NEW CONCEPT: NEXT_PUBLIC_ env var
//   NEXT_PUBLIC_API_BASE_URL is read from .env. The NEXT_PUBLIC_ prefix means
//   Next.js embeds it into the browser bundle (safe here: it is just a URL, not
//   a secret). We fall back to localhost:8000 so the app still works if .env is
//   missing during development.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:8000";

// --- Types that mirror the backend response shapes -------------------------
// These match app/schemas/conversation.py on the backend. Keeping a local copy
// means TypeScript can check our usage; it is not auto-generated, so if the
// backend schema changes, update these too.

export interface ApiMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ApiConversation {
  id: string;
  employee_id: string;
  status: string;
  messages: ApiMessage[];
  created_at: string;
  updated_at: string;
  message_count: number;
}

// NEW CONCEPT: a typed error
//   We throw this custom error so callers can tell an API failure apart from
//   any other kind of error, and show the user a friendly message.
export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

// A small shared helper that does the fetch, checks the HTTP status, and parses
// JSON. Every call below goes through this so error handling is consistent.
async function request<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // fetch() itself rejects only on network-level failure (server down, CORS,
    // no connection) — not on 4xx/5xx. Give a human-friendly message.
    throw new ApiError("Could not reach the server. Is the backend running?");
  }

  if (!response.ok) {
    // The backend sends errors as JSON like { "detail": "..." }. Try to read it.
    let detail = `Request failed (HTTP ${response.status}).`;
    try {
      const data = await response.json();
      if (data?.detail) detail = String(data.detail);
    } catch {
      // response had no JSON body; keep the generic message.
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

/**
 * Start a new conversation on the backend.
 * Mirrors: POST /conversations  { employee_id }  -> ApiConversation
 */
export async function createConversation(employeeId: string): Promise<ApiConversation> {
  return request<ApiConversation>("/conversations", { employee_id: employeeId });
}

/**
 * Send one user message into a conversation and get the updated conversation
 * back. The backend runs RAG + Claude and appends the assistant reply, so the
 * LAST message in the returned list is the AI answer.
 * Mirrors: POST /conversations/{id}/messages  { content }  -> ApiConversation
 */
export async function sendChatMessage(
  conversationId: string,
  content: string,
): Promise<ApiConversation> {
  return request<ApiConversation>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    { content },
  );
}

/** Convenience: pull just the assistant's latest reply text from a conversation. */
export function latestAssistantReply(conversation: ApiConversation): string {
  for (let i = conversation.messages.length - 1; i >= 0; i--) {
    if (conversation.messages[i].role === "assistant") {
      return conversation.messages[i].content;
    }
  }
  return "";
}
