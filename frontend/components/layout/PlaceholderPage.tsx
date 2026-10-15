// PlaceholderPage — shared "coming soon" screen for sections that are not
// built in this phase (My Tickets, Knowledge Base, Notifications, Profile).
import { Bot } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeading } from "@/components/ui/PageHeading";

export function PlaceholderPage({ title, subtitle, description }: { title: string; subtitle: string; description: string }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading title={title} subtitle={subtitle} />
      <div className="card">
        <EmptyState
          className="py-16"
          title="Coming soon"
          description={description}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/ai-support" className={buttonClasses("primary")}>
                <Bot className="h-4 w-4" aria-hidden="true" />
                Chat with AI
              </Link>
              <Link href="/dashboard" className={buttonClasses("secondary")}>
                Back to dashboard
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
