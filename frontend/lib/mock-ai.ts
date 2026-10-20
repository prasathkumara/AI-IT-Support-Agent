// The local "AI" for this phase. It is NOT a language model — it matches the
// employee's message against keyword lists from data/mock-ai-responses.ts and
// returns the matching troubleshooting steps. Keeping this logic out of the
// React components means it can later be swapped for a real API call without
// changing the chat UI.
import {
  fallbackMessage,
  troubleshootingScenarios,
} from "@/data/mock-ai-responses";
import type {
  MockAIResponse,
  Ticket,
  TicketDraft,
  TopicId,
  TroubleshootingScenario,
} from "@/types";

export function findScenario(id: TopicId): TroubleshootingScenario | undefined {
  return troubleshootingScenarios.find((s) => s.id === id);
}

/** Picks the scenario whose keywords appear most often in the message. */
export function matchScenario(message: string): TroubleshootingScenario | undefined {
  const text = message.toLowerCase();
  let best: { scenario: TroubleshootingScenario; score: number } | undefined;

  for (const scenario of troubleshootingScenarios) {
    const score = scenario.keywords.filter((keyword) => text.includes(keyword)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { scenario, score };
    }
  }
  return best?.scenario;
}

export function getMockResponse(message: string): MockAIResponse {
  const scenario = matchScenario(message);
  if (scenario) {
    return { kind: "scenario", scenario, message: scenario.intro, steps: scenario.steps };
  }
  return {
    kind: "fallback",
    message: fallbackMessage,
    suggestions: troubleshootingScenarios.map((s) => s.starterQuestion),
  };
}

/** A simulated "thinking" delay so the typing indicator is visible. */
export function mockResponseDelay(): number {
  return 900 + Math.round(Math.random() * 600);
}

/** Next ticket number after the highest existing INC-xxxx id. */
export function generateTicketId(existing: Ticket[]): string {
  const highest = existing.reduce((max, ticket) => {
    const n = Number.parseInt(ticket.id.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 1000);
  return `INC-${highest + 1}`;
}

export function buildTicketDraft(
  issueText: string,
  scenario: TroubleshootingScenario | undefined,
  existing: Ticket[],
): TicketDraft {
  return {
    subject: scenario?.ticketTitle ?? truncate(issueText, 60),
    category: scenario?.category ?? "Other",
    priority: scenario?.priority ?? "Medium",
    description: scenario
      ? `${issueText}\n\nThe employee tried the AI troubleshooting steps for "${scenario.label}" but the issue persists.`
      : issueText,
  };
}

function truncate(text: string, max: number): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
