"use client";

// useSupportChat — the conversation "state machine" behind the AI Support page.
//
// It owns the message list and walks through the resolution flow:
//   describe issue -> AI answer -> "Did this solve your issue?"
//     -> yes: success message + offer a new chat
//     -> no:  escalation message + ticket draft -> confirm (create) / cancel
//
// INTEGRATION (Phase: wire chat to real backend):
//   The AI ANSWER now comes from the real backend (RAG + Claude) via lib/api.ts,
//   instead of the local mock in lib/mock-ai.ts. Everything ELSE — the resolve
//   question, the ticket draft, ticket creation through SupportContext — is
//   unchanged and still frontend-only (the tickets backend comes later).
//
//   We still use matchScenario() from the mock to CATEGORISE the issue for the
//   ticket draft (category/priority/title). That is pure frontend logic and is
//   independent of where the answer text is generated.
import { useCallback, useRef, useState } from "react";

import { useSupport } from "@/context/SupportContext";
import { resolutionQuestion, suggestedQuestions } from "@/data/mock-ai-responses";
import { createConversation, latestAssistantReply, sendChatMessage, ApiError } from "@/lib/api";
import { buildTicketDraft, matchScenario } from "@/lib/mock-ai";
import { createId } from "@/lib/utils";
import type { ChatMessage, ChatPhase, TicketDraft, TroubleshootingScenario } from "@/types";

type NewMessage = Omit<ChatMessage, "id" | "createdAt">;

function makeMessage(message: NewMessage): ChatMessage {
  return { ...message, id: createId("msg"), createdAt: new Date().toISOString() };
}

function greeting(): ChatMessage {
  return makeMessage({
    role: "assistant",
    content: "Hi! I'm your AI IT assistant. Describe the issue you're running into and I'll help you fix it.",
    suggestions: suggestedQuestions,
  });
}

interface ActiveIssue {
  text: string;
  scenario?: TroubleshootingScenario;
}

export function useSupportChat() {
  const { user, tickets, addTicket } = useSupport();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greeting()]);
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState<TicketDraft | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const activeIssue = useRef<ActiveIssue | null>(null);

  // The backend conversation id. Created lazily on the first message so an
  // opened-but-unused chat does not create an empty conversation. Reset on "New chat".
  const conversationId = useRef<string | null>(null);

  // Bumped on "New chat" so a reply arriving late for an old conversation is dropped.
  const turnId = useRef(0);

  const append = useCallback((...next: NewMessage[]) => {
    setMessages((prev) => [...prev, ...next.map(makeMessage)]);
  }, []);

  // Ensure a backend conversation exists; create it on first use. Uses the
  // signed-in user's email as the employee_id (works until real auth exists).
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId.current) return conversationId.current;
    const employeeId = user?.email ?? "anonymous@local";
    const convo = await createConversation(employeeId);
    conversationId.current = convo.id;
    return convo.id;
  }, [user]);

  const sendMessage = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || isTyping || isCreatingTicket) return;

      const id = ++turnId.current;
      append({ role: "user", content: text });
      // A new message replaces any pending question or ticket draft.
      setPhase("idle");
      setDraft(null);
      setIsTyping(true);

      // Fire the real backend call. We keep track of the issue + a mock-derived
      // scenario so the (unchanged) ticket flow can categorise it later.
      (async () => {
        try {
          const convoId = await ensureConversation();
          const conversation = await sendChatMessage(convoId, text);
          if (id !== turnId.current) return; // a newer turn / new chat superseded this
          const reply = latestAssistantReply(conversation) || "I'm sorry, I couldn't generate a reply. Please try again.";

          activeIssue.current = { text, scenario: matchScenario(text) };
          setIsTyping(false);
          append(
            { role: "assistant", content: reply },
            { role: "assistant", content: resolutionQuestion },
          );
          setPhase("awaiting-resolution");
        } catch (error) {
          if (id !== turnId.current) return;
          setIsTyping(false);
          const message =
            error instanceof ApiError
              ? `Sorry, I hit a problem reaching the assistant: ${error.message}`
              : "Sorry, something went wrong. Please try again.";
          append({ role: "assistant", content: message, suggestions: suggestedQuestions });
          setPhase("idle");
        }
      })();
    },
    [append, ensureConversation, isCreatingTicket, isTyping],
  );

  const markResolved = useCallback(() => {
    if (phase !== "awaiting-resolution" || isTyping) return;
    append({ role: "user", content: "Yes, it works" });
    setPhase("idle");
    activeIssue.current = null;
    append({
      role: "assistant",
      tone: "success",
      content:
        "Great news — I'm glad that fixed it! Your issue is marked as resolved, so no ticket is needed. Is there anything else I can help you with?",
      offerNewChat: true,
    });
  }, [append, isTyping, phase]);

  const markNotResolved = useCallback(() => {
    if (phase !== "awaiting-resolution" || isTyping) return;
    const issue = activeIssue.current;
    append({ role: "user", content: "No, still an issue" });
    append({
      role: "assistant",
      content:
        "Sorry that didn't solve it. I can escalate this to the IT team so a specialist can take a look. I've prepared a ticket with the details below — please review it and confirm to submit.",
    });
    setDraft(buildTicketDraft(issue?.text ?? "Issue not resolved by AI troubleshooting.", issue?.scenario, tickets));
    setPhase("confirming-ticket");
  }, [append, isTyping, phase, tickets]);

  const confirmTicket = useCallback(() => {
    if (!draft || isCreatingTicket) return;
    const id = turnId.current;
    setIsCreatingTicket(true);
    // addTicket now calls the backend (POST /tickets). It is async, so we run
    // it in an IIFE and await the real created ticket (with its server id).
    (async () => {
      try {
        const ticket = await addTicket(draft);
        if (id !== turnId.current) return;
        activeIssue.current = null;
        setDraft(null);
        setPhase("idle");
        append({
          role: "assistant",
          tone: "success",
          content: `Your ticket ${ticket.id} has been created with status "Open". The IT team will follow up soon - you can track it from your dashboard.`,
          link: { href: "/dashboard", label: "View on dashboard" },
          offerNewChat: true,
        });
      } catch {
        if (id !== turnId.current) return;
        append({
          role: "assistant",
          content:
            "Sorry, I couldn't create the ticket just now. Please check your connection and try again.",
        });
      } finally {
        setIsCreatingTicket(false);
      }
    })();
  }, [addTicket, append, draft, isCreatingTicket]);

  const cancelTicket = useCallback(() => {
    if (!draft || isCreatingTicket) return;
    setDraft(null);
    setPhase("idle");
    append(
      { role: "user", content: "Cancel ticket" },
      {
        role: "assistant",
        content:
          "No problem — I haven't created a ticket. You can describe the issue again or ask about something else whenever you're ready.",
        suggestions: suggestedQuestions,
      },
    );
  }, [append, draft, isCreatingTicket]);

  const newChat = useCallback(() => {
    turnId.current += 1;
    conversationId.current = null; // start a fresh backend conversation next time
    activeIssue.current = null;
    setIsTyping(false);
    setIsCreatingTicket(false);
    setDraft(null);
    setPhase("idle");
    setMessages([greeting()]);
  }, []);

  return {
    messages,
    phase,
    isTyping,
    draft,
    isCreatingTicket,
    sendMessage,
    markResolved,
    markNotResolved,
    confirmTicket,
    cancelTicket,
    newChat,
  };
}
