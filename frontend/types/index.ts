// Shared TypeScript types for the frontend prototype.
//
// Keeping every domain type in one file means the dashboard, the chatbot, the
// mock data and the shared context all agree on the same shapes. If a field
// changes here, the compiler points at every place that needs updating.

export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

export type TicketPriority = "Low" | "Medium" | "High";

export type TicketCategory =
  | "Network"
  | "Account"
  | "Software"
  | "Email"
  | "Hardware"
  | "Other";

export interface Ticket {
  id: string;
  /** Who raised the ticket â€” employees only ever see tickets with their own email. */
  requesterName: string;
  requesterEmail: string;
  /** The IT admin working on the ticket. Unset until an admin assigns it. */
  assigneeName?: string;
  assigneeEmail?: string;
  /** ISO 8601 timestamp, set when an admin resolves the ticket. */
  resolvedAt?: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  description: string;
  /** ISO 8601 timestamp, e.g. "2026-10-07T09:30:00.000Z". */
  createdAt: string;
}

/** "employee" raises tickets; "admin" (IT staff) sees and manages every ticket. */
export type UserRole = "employee" | "admin";

export interface Employee {
  role: UserRole;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
}

export type ActivityKind = "ticket-update" | "ticket-created" | "announcement";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  createdAt: string;
  /** When set, only this employee sees the item; otherwise it is shown to everyone. */
  recipientEmail?: string;
}

/** The five troubleshooting scenarios the mock AI understands. */
export type TopicId = "vpn" | "password" | "software" | "email" | "printer";

export interface TroubleshootingScenario {
  id: TopicId;
  /** Short label shown on topic cards, e.g. "VPN Access". */
  label: string;
  /** One-line description shown under the label on topic cards. */
  summary: string;
  category: TicketCategory;
  priority: TicketPriority;
  /** Lower-case words/phrases that route a free-text question to this scenario. */
  keywords: string[];
  /** The question sent automatically when a topic card is clicked. */
  starterQuestion: string;
  /** Title used when this issue is escalated into a ticket. */
  ticketTitle: string;
  intro: string;
  steps: string[];
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Optional numbered troubleshooting steps rendered under the text. */
  steps?: string[];
  /** Optional suggested questions rendered as clickable chips. */
  suggestions?: string[];
  /** Optional link rendered as a call to action (e.g. back to the dashboard). */
  link?: { href: string; label: string };
  /** When true, a "Start a new chat" button is shown under the message. */
  offerNewChat?: boolean;
  /** Visual tone of an assistant bubble (e.g. green for a success message). */
  tone?: "default" | "success";
  createdAt: string;
}

/**
 * Where the conversation is in the resolution flow:
 * - idle:                 waiting for the employee to describe an issue
 * - awaiting-resolution:  steps were shown, asking "Did this solve your issue?"
 * - confirming-ticket:    the employee said no; a ticket draft awaits confirmation
 */
export type ChatPhase = "idle" | "awaiting-resolution" | "confirming-ticket";

/** The result of the local mock "AI" for one employee message. */
export type MockAIResponse =
  | { kind: "scenario"; scenario: TroubleshootingScenario; message: string; steps: string[] }
  | { kind: "fallback"; message: string; suggestions: string[] };

/** A ticket that has been drafted in the chat but not yet confirmed. */
export type TicketDraft = Omit<
  Ticket,
  "id" | "status" | "createdAt" | "requesterName" | "requesterEmail" | "assigneeName" | "assigneeEmail" | "resolvedAt"
>;

