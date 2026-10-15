// RecentTickets — latest tickets as a table on wider screens and as stacked
// cards on phones (so there is never horizontal scrolling).
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { Ticket } from "@/types";

export function RecentTickets({ tickets, limit = 5 }: { tickets: Ticket[]; limit?: number }) {
  const recent = [...tickets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return (
    <section aria-labelledby="recent-tickets-heading" className="card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <h2 id="recent-tickets-heading" className="text-base font-semibold text-ink">
          Recent tickets
        </h2>
        <Link href="/tickets" className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline">
          View all
        </Link>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          description="When the AI can't solve an issue, you can escalate it to IT and the ticket will appear here."
          action={
            <Link href="/ai-support" className={buttonClasses("primary", "sm")}>
              Chat with AI
            </Link>
          }
        />
      ) : (
        <>
          {/* md+ : table */}
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="bg-surface text-xs uppercase tracking-wide text-ink-subtle">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Ticket ID</th>
                <th scope="col" className="px-5 py-3 font-medium">Subject</th>
                <th scope="col" className="hidden px-5 py-3 font-medium lg:table-cell">Category</th>
                <th scope="col" className="px-5 py-3 font-medium">Status</th>
                <th scope="col" className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((ticket) => (
                <tr key={ticket.id} className="transition-colors hover:bg-brand-50/40">
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-brand-700">{ticket.id}</td>
                  <td className="max-w-[16rem] truncate px-5 py-3.5 text-ink" title={ticket.subject}>
                    {ticket.subject}
                  </td>
                  <td className="hidden px-5 py-3.5 text-ink-muted lg:table-cell">{ticket.category}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-muted">{formatDate(ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* < md : cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {recent.map((ticket) => (
              <li key={ticket.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-brand-700">{ticket.id}</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="mt-1.5 text-sm font-medium text-ink">{ticket.subject}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {ticket.category} · {formatDate(ticket.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
