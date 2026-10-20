"use client";

// /ai-support — the chatbot and troubleshooting page.
//
// Query parameters start a conversation automatically:
//   ?topic=vpn   → sends that topic's starter question (from dashboard cards)
//   ?q=...       → sends the text as typed (from the header search box)
// After the question is sent the URL is cleaned up so a refresh doesn't resend it.
import { Headset, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { topicIcons } from "@/components/illustrations/TopicIcons";
import { PageHeading } from "@/components/ui/PageHeading";
import { Spinner } from "@/components/ui/Spinner";
import { useSupport } from "@/context/SupportContext";
import { troubleshootingScenarios } from "@/data/mock-ai-responses";
import { findScenario } from "@/lib/mock-ai";
import type { TopicId } from "@/types";

function isTopicId(value: string | null): value is TopicId {
  return troubleshootingScenarios.some((s) => s.id === value);
}

function TopicsPanel() {
  return (
    <aside className="hidden w-72 shrink-0 space-y-4 xl:block">
      <section className="card p-4" aria-labelledby="ai-topics-heading">
        <h2 id="ai-topics-heading" className="text-sm font-semibold text-ink">
          Common topics
        </h2>
        <ul className="mt-3 space-y-1">
          {troubleshootingScenarios.map((topic) => {
            const Icon = topicIcons[topic.id];
            return (
              <li key={topic.id}>
                <Link
                  href={`/ai-support?topic=${topic.id}`}
                  scroll={false}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-brand-50"
                >
                  <Icon className="h-9 w-9" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{topic.label}</span>
                    <span className="block truncate text-xs text-ink-muted">{topic.summary}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
          Tips for faster help
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-ink-muted">
          <li>Mention the app or device that&apos;s affected.</li>
          <li>Include any error message you see.</li>
          <li>Say what you&apos;ve already tried.</li>
        </ul>
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 p-4 text-white">
        <Headset className="h-5 w-5" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold">Prefer a human?</p>
        <p className="mt-1 text-xs leading-relaxed text-white/85">
          If the AI can&apos;t fix it, answer &ldquo;No, still an issue&rdquo; and we&apos;ll draft a ticket for the IT team.
        </p>
      </section>
    </aside>
  );
}

function AISupportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSupport();

  const topic = searchParams.get("topic");
  const query = searchParams.get("q")?.trim();
  const initialQuestion = isTopicId(topic) ? findScenario(topic)?.starterQuestion : query || undefined;

  const clearQuery = useCallback(() => {
    router.replace("/ai-support", { scroll: false });
  }, [router]);

  if (!user) return null;

  return (
    <div className="mx-auto flex max-w-7xl gap-6">
      <div className="min-w-0 flex-1 space-y-5">
        <PageHeading title="AI Support" subtitle="Ask anything about your IT issue. We'll help you find a solution." />
        <ChatWindow userName={user.name} initialQuestion={initialQuestion} onInitialQuestionHandled={clearQuery} />
      </div>
      <TopicsPanel />
    </div>
  );
}

export default function AISupportPage() {
  // useSearchParams() must sit inside a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner label="Loading AI Support" />
        </div>
      }
    >
      <AISupportContent />
    </Suspense>
  );
}
