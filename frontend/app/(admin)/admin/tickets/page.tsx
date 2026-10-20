"use client";

// /admin/tickets — every employee's tickets, with search, status and
// assignment filters, an "Assign to" dropdown and a Resolve button.
// ?q=... (from the header search box) pre-fills the search field.
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { TicketList, ticketStatuses } from "@/components/tickets/TicketList";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeading } from "@/components/ui/PageHeading";
import { Spinner } from "@/components/ui/Spinner";
import { useSupport } from "@/context/SupportContext";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/types";

type StatusFilter = TicketStatus | "All";
type AssignmentFilter = "anyone" | "me" | "unassigned";

const assignmentOptions: { value: AssignmentFilter; label: string }[] = [
  { value: "anyone", label: "Anyone" },
  { value: "me", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
];

function AllTickets() {
  const { user, tickets, admins, assignTicket, resolveTicket } = useSupport();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [assignment, setAssignment] = useState<AssignmentFilter>("anyone");

  // Pick up new header searches made while already on this page.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (status !== "All" && t.status !== status) return false;
      if (assignment === "me" && t.assigneeEmail !== user?.email) return false;
      if (assignment === "unassigned" && t.assigneeEmail) return false;
      if (!q) return true;
      return [t.id, t.subject, t.requesterName, t.requesterEmail, t.category, t.assigneeName ?? ""].some((field) =>
        field.toLowerCase().includes(q),
      );
    });
  }, [tickets, query, status, assignment, user]);

  const filters: StatusFilter[] = ["All", ...ticketStatuses];
  const countFor = (f: StatusFilter) => (f === "All" ? tickets.length : tickets.filter((t) => t.status === f).length);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading title="All Tickets" subtitle="Every ticket raised by employees across the organisation." />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatus(f)}
              aria-pressed={status === f}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                status === f
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-ink-muted ring-1 ring-inset ring-slate-200 hover:bg-brand-50 hover:text-brand-700",
              )}
            >
              {f} <span className="opacity-70">({countFor(f)})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:w-auto">
          <label htmlFor="assignment-filter" className="sr-only">
            Filter by assignee
          </label>
          <select
            id="assignment-filter"
            value={assignment}
            onChange={(e) => setAssignment(e.target.value as AssignmentFilter)}
            className="h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            {assignmentOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="relative sm:flex-1 lg:w-72 lg:flex-none">
            <label htmlFor="ticket-search" className="sr-only">
              Search tickets
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
            <input
              id="ticket-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ID, subject or employee…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
        </div>
      </div>

      <TicketList
        tickets={filtered}
        adminActions={{ admins, onAssign: assignTicket, onResolve: resolveTicket }}
        ticketHref={(id) => `/admin/tickets/${id}`}
        empty={<EmptyState className="py-16" title="No matching tickets" description="Try a different search or status filter." />}
      />
    </div>
  );
}

// useSearchParams() must sit inside a Suspense boundary in the App Router.
export default function AdminTicketsPage() {
  return (
    <Suspense fallback={<Spinner label="Loading tickets" />}>
      <AllTickets />
    </Suspense>
  );
}
