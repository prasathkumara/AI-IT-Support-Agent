"use client";

// /dashboard — the employee home page.
// All numbers come from SupportContext, so tickets escalated from the chatbot
// show up here immediately.
import { PopularTopics } from "@/components/dashboard/PopularTopics";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RecentTickets } from "@/components/dashboard/RecentTickets";
import { TicketSummary } from "@/components/dashboard/TicketSummary";
import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { ChatBubbleIcon, KnowledgeIcon, TicketIcon } from "@/components/illustrations/TopicIcons";
import { useSupport } from "@/context/SupportContext";

export default function DashboardPage() {
  const { user, myTickets, activity } = useSupport();
  if (!user) return null; // AppShell redirects to /login

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <WelcomeSection name={user.name} today={new Date()} />

      <section aria-label="Quick actions" className="grid gap-4 lg:grid-cols-3">
        <QuickActionCard
          href="/ai-support"
          title="Chat with AI"
          description="Describe your issue and get instant troubleshooting steps."
          icon={<ChatBubbleIcon />}
        />
        <QuickActionCard
          href="/tickets"
          title="View My Tickets"
          description="Track the status of issues escalated to IT."
          icon={<TicketIcon />}
        />
        <QuickActionCard
          href="/knowledge-base"
          title="Browse Knowledge"
          description="Explore guides and answers to common questions."
          icon={<KnowledgeIcon />}
        />
      </section>

      <PopularTopics />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">My tickets</h2>
            <p className="text-sm text-ink-muted">An overview of everything you&apos;ve raised with IT.</p>
          </div>
          <TicketSummary tickets={myTickets} />
          <RecentTickets tickets={myTickets} />
        </div>
        <RecentActivity items={activity} />
      </div>
    </div>
  );
}
