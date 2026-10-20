"use client";

// /admin — the IT admin's overview of every ticket in the system.
// Stats cover all employees' tickets; the queue lists what still needs work,
// highest priority first, where the admin can assign or resolve each ticket.
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { TicketSummary } from "@/components/dashboard/TicketSummary";
import { TicketList } from "@/components/tickets/TicketList";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeading } from "@/components/ui/PageHeading";
import { useSupport } from "@/context/SupportContext";
import { firstName } from "@/lib/utils";
import type { TicketPriority } from "@/types";

const priorityRank: Record<TicketPriority, number> = { High: 0, Medium: 1, Low: 2 };

export default function AdminOverviewPage() {
  const { user, tickets, admins, assignTicket, resolveTicket } = useSupport();
  if (!user) return null; // AppShell redirects to /login

  const queue = tickets
    .filter((t) => t.status !== "Resolved")
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  const requesters = new Set(tickets.map((t) => t.requesterEmail)).size;
  const unassigned = queue.filter((t) => !t.assigneeEmail).length;
  const mine = queue.filter((t) => t.assigneeEmail === user.email).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeading
        title={`Welcome back, ${firstName(user.name)}`}
        subtitle={`${tickets.length} tickets from ${requesters} employees · ${unassigned} unassigned · ${mine} assigned to you`}
        actions={
          <Link href="/admin/tickets" className={buttonClasses("primary")}>
            View all tickets
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      <TicketSummary tickets={tickets} />

      <section aria-labelledby="queue-heading" className="space-y-4">
        <div>
          <h2 id="queue-heading" className="text-lg font-semibold text-ink">
            Needs attention
          </h2>
          <p className="text-sm text-ink-muted">Unresolved tickets, highest priority first. Assign each one to an admin, then resolve it.</p>
        </div>
        <TicketList
          tickets={queue}
          adminActions={{ admins, onAssign: assignTicket, onResolve: resolveTicket }}
          ticketHref={(id) => `/admin/tickets/${id}`}
          empty={<EmptyState className="py-12" title="All caught up" description="Every ticket has been resolved." />}
        />
      </section>
    </div>
  );
}
