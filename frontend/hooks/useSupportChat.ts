"use client";

// useSupportChat — the conversation "state machine" behind the AI Support page.
//
// It owns the message list and walks through the resolution flow:
//   describe issue → troubleshooting steps → "Did this solve your issue?"
//     → yes: success message + offer a new chat
//     → no:  escalation message + ticket draft → confirm (create) / cancel
//
// All responses come from lib/mock-ai.ts; ticket creation goes through the
// shared SupportContext. The chat components only render what this returns.
import { useCallback, useRef, useState } from "react";

import { useSupport } from "@/context/SupportContext";
import { assistantGreeting, resolutionQuestion, suggestedQuestions } from "@/data/mock-ai-responses";
import { buildTicketDraft, getMockResponse, mockResponseDelay } from "@/lib/mock-ai";
import { createId } from "@/lib/utils";
import type { ChatMessage, ChatPhase, TicketDraft, TroubleshootingScenario } from "@/types";

type NewMessage = Omit<ChatMessage, "id" | "createdAt">;

function makeMessage(message: NewMessage): ChatMessage {
  return { ...message, id: createId("msg"), createdAt: new Date().toISOString() };
}

function greeting(): ChatMessage {
  return makeMessage({ role: "assistant", content: assistantGreeting, suggestions: suggestedQuestions });
}

interface ActiveIssue {
  text: string;
  scenario?: TroubleshootingScenario;
}

export function useSupportChat() {
  const { tickets, addTicket } = useSupport();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greeting()]);
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState<TicketDraft | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const activeIssue = useRef<ActiveIssue | null>(null);

  // Bumped on "New chat" so replies scheduled for the old conversation are dropped.
  const conversationId = useRef(0);

  const append = useCallback((...next: NewMessage[]) => {
    setMessages((prev) => [...prev, ...next.map(makeMessage)]);
  }, []);

  /** Shows the typing indicator, then runs `respond` after a short delay. */
  const replyAfterDelay = useCallback((respond: () => void, delay = mockResponseDelay()) => {
    const id = conversationId.current;
    setIsTyping(true);
    window.setTimeout(() => {
      if (id !== conversationId.current) return;
      setIsTyping(false);
      respond();
    }, delay);
  }, []);

  const sendMessage = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || isTyping || isCreatingTicket) return;

      append({ role: "user", content: text });
      // A new message replaces any pending question or ticket draft.
      setPhase("idle");
      setDraft(null);

      replyAfterDelay(() => {
        const response = getMockResponse(text);
        if (response.kind === "scenario") {
          activeIssue.current = { text, scenario: response.scenario };
          append(
            { role: "assistant", content: response.message, steps: response.steps },
            { role: "assistant", content: resolutionQuestion },
          );
          setPhase("awaiting-resolution");
        } else {
          activeIssue.current = null;
          append({ role: "assistant", content: response.message, suggestions: response.suggestions });
        }
      });
    },
    [append, isCreatingTicket, isTyping, replyAfterDelay],
  );

  const markResolved = useCallback(() => {
    if (phase !== "awaiting-resolution" || isTyping) return;
    append({ role: "user", content: "Yes, it works" });
    setPhase("idle");
    replyAfterDelay(() => {
      activeIssue.current = null;
      append({
        role: "assistant",
        tone: "success",
        content:
          "Great news — I'm glad that fixed it! Your issue is marked as resolved, so no ticket is needed. Is there anything else I can help you with?",
        offerNewChat: true,
      });
    }, 700);
  }, [append, isTyping, phase, replyAfterDelay]);

  const markNotResolved = useCallback(() => {
    if (phase !== "awaiting-resolution" || isTyping) return;
    const issue = activeIssue.current;
    append({ role: "user", content: "No, still an issue" });
    setPhase("idle");
    replyAfterDelay(() => {
      append({
        role: "assistant",
        content:
          "Sorry that didn't solve it. I can escalate this to the IT team so a specialist can take a look. I've prepared a ticket with the details below — please review it and confirm to submit.",
      });
      setDraft(buildTicketDraft(issue?.text ?? "Issue not resolved by AI troubleshooting.", issue?.scenario, tickets));
      setPhase("confirming-ticket");
    });
  }, [append, isTyping, phase, replyAfterDelay, tickets]);

  const confirmTicket = useCallback(() => {
    if (!draft || isCreatingTicket) return;
    const id = conversationId.current;
    setIsCreatingTicket(true);
    // Simulated submission delay — nothing leaves the browser.
    window.setTimeout(() => {
      if (id !== conversationId.current) return;
      const ticket = addTicket(draft);
      setIsCreatingTicket(false);
      setDraft(null);
      setPhase("idle");
      activeIssue.current = null;
      append({
        role: "assistant",
        tone: "success",
        content: `Your ticket ${ticket.id} has been created with status "Open". The IT team will follow up soon — you can track it from your dashboard.`,
        link: { href: "/dashboard", label: "View on dashboard" },
        offerNewChat: true,
      });
    }, 900);
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
    conversationId.current += 1;
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
