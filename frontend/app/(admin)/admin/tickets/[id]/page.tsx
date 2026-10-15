"use client";

// /admin/tickets/[id] — one ticket in full. The admin reads the employee's
// description, assigns the ticket to any IT admin and resolves it. Tickets are
// created only by employees, so nothing else here is editable.
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { AssignSelect } from "@/components/tickets/TicketList";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { useSupport } from "@/context/SupportContext";
import { formatDate, formatTime } from "@/lib/utils";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

const backLink = (
  <Link href="/admin/tickets" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    All tickets
  </Link>
);

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, tickets, admins, assignTicket, resolveTicket } = useSupport();
  const ticket = tickets.find((t) => t.id === id);

  if (!ticket) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {backLink}
        <div className="card">
          <EmptyState
            className="py-16"
            title="Ticket not found"
            description={`There is no ticket with the ID ${id}.`}
            action={
              <Link href="/admin/tickets" className={buttonClasses("primary", "sm")}>
                Back to all tickets
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const resolved = ticket.status === "Resolved";
  const actions = { admins, onAssign: assignTicket, onResolve: resolveTicket };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {backLink}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand-700">{ticket.id}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{ticket.subject}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
        {!resolved && (
          <Button onClick={() => resolveTicket(ticket.id)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Mark as resolved
          </Button>
        )}
      </div>

      {resolved && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Resolved by {ticket.assigneeName ?? "IT Support"}
          {ticket.resolvedAt && ` on ${formatDate(ticket.resolvedAt)}`}.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="description-heading" className="card p-5 sm:p-6 lg:col-span-2">
          <h2 id="description-heading" className="text-base font-semibold text-ink">
            Description
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{ticket.description}</p>

          <h2 className="mt-6 text-base font-semibold text-ink">Raised by</h2>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={ticket.requesterName} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{ticket.requesterName}</p>
              <p className="truncate text-xs text-ink-subtle">{ticket.requesterEmail}</p>
            </div>
          </div>
        </section>

        <aside className="card h-fit p-5 sm:p-6" aria-labelledby="details-heading">
          <h2 id="details-heading" className="text-base font-semibold text-ink">
            Details
          </h2>

          <div className="mt-4">
            <p className="text-sm font-medium text-ink">Assigned to</p>
            <div className="mt-1.5">
              {resolved ? (
                <p className="text-sm text-ink">{ticket.assigneeName ?? "Unassigned"}</p>
              ) : (
                <AssignSelect
                  ticket={ticket}
                  actions={actions}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              )}
            </div>
            {!resolved && user && ticket.assigneeEmail !== user.email && (
              <button
                type="button"
                onClick={() => assignTicket(ticket.id, user.email)}
                className="mt-2 text-sm font-medium text-brand-600 hover:underline"
              >
                Assign to me
              </button>
            )}
          </div>

          <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
            <Detail label="Category">{ticket.category}</Detail>
            <Detail label="Created">
              {formatDate(ticket.createdAt)}, {formatTime(ticket.createdAt)}
            </Detail>
            {ticket.resolvedAt && <Detail label="Resolved">{formatDate(ticket.resolvedAt)}</Detail>}
          </dl>
        </aside>
      </div>
    </div>
  );
}
