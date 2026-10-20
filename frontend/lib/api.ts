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

import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from "@/types";

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


// ===========================================================================
// Tickets (employee slice) — mirrors backend app/api/routes/tickets.py
// ===========================================================================
//
// The backend uses snake_case (requester_name); the frontend Ticket type uses
// camelCase (requesterName). We translate at this boundary with
// `apiTicketToTicket` so none of the existing UI components need to change.

// Shape returned by the backend's TicketResponse (snake_case, as sent over JSON).
export interface ApiTicket {
  id: string;
  requester_name: string;
  requester_email: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  assignee_name: string | null;
  assignee_email: string | null;
  resolved_at: string | null;
  created_at: string;
}

// What we send to create a ticket (matches TicketCreateRequest on the backend).
export interface CreateTicketPayload {
  requester_name: string;
  requester_email: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

/** Convert a backend ApiTicket (snake_case) into the frontend Ticket (camelCase). */
export function apiTicketToTicket(t: ApiTicket): Ticket {
  return {
    id: t.id,
    requesterName: t.requester_name,
    requesterEmail: t.requester_email,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    description: t.description,
    assigneeName: t.assignee_name ?? undefined,
    assigneeEmail: t.assignee_email ?? undefined,
    resolvedAt: t.resolved_at ?? undefined,
    createdAt: t.created_at,
  };
}

// A small GET helper (the existing `request` above is POST-only).
async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: "GET" });
  } catch {
    throw new ApiError("Could not reach the server. Is the backend running?");
  }
  if (!response.ok) {
    let detail = `Request failed (HTTP ${response.status}).`;
    try {
      const data = await response.json();
      if (data?.detail) detail = String(data.detail);
    } catch {
      // no JSON body; keep generic message
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

/**
 * Create a ticket.
 * Mirrors: POST /tickets  { requester_name, requester_email, subject, description, category, priority }
 */
export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const created = await request<ApiTicket>("/tickets", payload);
  return apiTicketToTicket(created);
}

/**
 * List one employee's tickets, newest first.
 * Mirrors: GET /tickets?employee_id={email}
 */
export async function listEmployeeTickets(employeeEmail: string): Promise<Ticket[]> {
  const tickets = await getJson<ApiTicket[]>(
    `/tickets?employee_id=${encodeURIComponent(employeeEmail)}`,
  );
  return tickets.map(apiTicketToTicket);
}

/**
 * Fetch one ticket by its friendly id (e.g. TICKET-1).
 * Mirrors: GET /tickets/{id}
 */
export async function getTicket(ticketId: string): Promise<Ticket> {
  const ticket = await getJson<ApiTicket>(`/tickets/${encodeURIComponent(ticketId)}`);
  return apiTicketToTicket(ticket);
}


// A small PATCH helper (used for admin assign/resolve, which partially update
// an existing ticket). Same error handling as the POST/GET helpers above.
async function patchJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the server. Is the backend running?");
  }
  if (!response.ok) {
    let detail = `Request failed (HTTP ${response.status}).`;
    try {
      const data = await response.json();
      if (data?.detail) detail = String(data.detail);
    } catch {
      // no JSON body; keep generic message
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

/**
 * List EVERY ticket, newest first (admin view).
 * Mirrors: GET /tickets/all
 */
export async function listAllTickets(): Promise<Ticket[]> {
  const tickets = await getJson<ApiTicket[]>("/tickets/all");
  return tickets.map(apiTicketToTicket);
}

/**
 * Assign a ticket to an IT admin. An Open ticket becomes In Progress.
 * Mirrors: PATCH /tickets/{id}/assign  { assignee_name, assignee_email }
 */
export async function assignTicketApi(
  ticketId: string,
  assigneeName: string,
  assigneeEmail: string,
): Promise<Ticket> {
  const updated = await patchJson<ApiTicket>(
    `/tickets/${encodeURIComponent(ticketId)}/assign`,
    { assignee_name: assigneeName, assignee_email: assigneeEmail },
  );
  return apiTicketToTicket(updated);
}

/**
 * Mark a ticket resolved. If unassigned, the resolver becomes the assignee.
 * Mirrors: PATCH /tickets/{id}/resolve  { resolver_name?, resolver_email? }
 */
export async function resolveTicketApi(
  ticketId: string,
  resolverName?: string,
  resolverEmail?: string,
): Promise<Ticket> {
  const updated = await patchJson<ApiTicket>(
    `/tickets/${encodeURIComponent(ticketId)}/resolve`,
    { resolver_name: resolverName ?? null, resolver_email: resolverEmail ?? null },
  );
  return apiTicketToTicket(updated);
}
