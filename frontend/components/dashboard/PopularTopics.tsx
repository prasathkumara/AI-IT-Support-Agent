// PopularTopics — one card per troubleshooting scenario. Clicking a card opens
// AI Support with ?topic=<id>, which auto-sends that topic's starter question.
import Link from "next/link";

import { topicIcons } from "@/components/illustrations/TopicIcons";
import { troubleshootingScenarios } from "@/data/mock-ai-responses";

export function PopularTopics() {
  return (
    <section aria-labelledby="popular-topics-heading">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="popular-topics-heading" className="text-lg font-semibold text-ink">
            Popular topics
          </h2>
          <p className="text-sm text-ink-muted">Pick a topic and the AI assistant starts troubleshooting right away.</p>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {troubleshootingScenarios.map((topic) => {
          const Icon = topicIcons[topic.id];
          return (
            <li key={topic.id}>
              <Link
                href={`/ai-support?topic=${topic.id}`}
                aria-label={`${topic.label}: ask the AI assistant`}
                className="card group flex h-full flex-col gap-3 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
              >
                <Icon className="transition-transform group-hover:scale-105" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{topic.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{topic.summary}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
