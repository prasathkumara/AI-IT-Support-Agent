// TicketList — the full ticket list used by both roles.
//
// Employees see their own tickets read-only, including who in IT is working on
// each one. The IT admin passes `adminActions` to add a "Raised by" column, an
// "Assign to" dropdown and a Resolve button, and `ticketHref` to link each
// ticket ID to its detail page. Like RecentTickets it is a table on wider
// screens and stacked cards on phones, so there is never horizontal scrolling.
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { PriorityBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { Employee, Ticket, TicketStatus } from "@/types";

export const ticketStatuses: TicketStatus[] = ["Open", "In Progress", "Resolved"];

export interface AdminActions {
  admins: Employee[];
  onAssign: (id: string, adminEmail: string) => void;
  onResolve: (id: string) => void;
}

interface TicketListProps {
  tickets: Ticket[];
  adminActions?: AdminActions;
  ticketHref?: (id: string) => string;
  /** Shown instead of the list when `tickets` is empty. */
  empty: ReactNode;
}

/** "Assign to" dropdown. Resolved tickets keep their assignee as plain text. */
export function AssignSelect({ ticket, actions, className }: { ticket: Ticket; actions: AdminActions; className?: string }) {
  if (ticket.status === "Resolved") return <AssigneeName ticket={ticket} />;
  return (
    <select
      value={ticket.assigneeEmail ?? ""}
      onChange={(e) => actions.onAssign(ticket.id, e.target.value)}
      aria-label={`Assign ${ticket.id}`}
      className={
        className ??
        "h-8 max-w-[11rem] rounded-lg border border-slate-200 bg-white pl-2 pr-7 text-xs font-medium text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      }
    >
      <option value="" disabled>
        Unassigned
      </option>
      {actions.admins.map((admin) => (
        <option key={admin.email} value={admin.email}>
          {admin.name}
        </option>
      ))}
    </select>
  );
}

export function AssigneeName({ ticket }: { ticket: Ticket }) {
  return ticket.assigneeName ? (
    <span className="whitespace-nowrap text-ink">{ticket.assigneeName}</span>
  ) : (
    <span className="italic text-ink-subtle">Unassigned</span>
  );
}

function ResolveCell({ ticket, actions }: { ticket: Ticket; actions: AdminActions }) {
  if (ticket.status === "Resolved") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {ticket.resolvedAt ? formatDate(ticket.resolvedAt) : "Resolved"}
      </span>
    );
  }
  return (
    <Button size="sm" variant="secondary" className="h-8" onClick={() => actions.onResolve(ticket.id)} aria-label={`Resolve ${ticket.id}`}>
      Resolve
    </Button>
  );
}

function TicketId({ id, href }: { id: string; href?: string }) {
  if (!href) return <>{id}</>;
  return (
    <Link href={href} className="hover:underline">
      {id}
    </Link>
  );
}

export function TicketList({ tickets, adminActions, ticketHref, empty }: TicketListProps) {
  if (tickets.length === 0) return <div className="card">{empty}</div>;

  const sorted = [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const isAdmin = Boolean(adminActions);

  return (
    <div className="card overflow-hidden">
      {/* md+ : table */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="bg-surface text-xs uppercase tracking-wide text-ink-subtle">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Ticket ID</th>
            <th scope="col" className="px-4 py-3 font-medium">Subject</th>
            {isAdmin && <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Raised by</th>}
            {!isAdmin && <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Category</th>}
            <th scope="col" className="hidden px-4 py-3 font-medium xl:table-cell">Priority</th>
            <th scope="col" className="px-4 py-3 font-medium">{isAdmin ? "Assign to" : "Assigned to"}</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            {isAdmin ? (
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            ) : (
              <th scope="col" className="px-4 py-3 font-medium">Created</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((ticket) => (
            <tr key={ticket.id} className="transition-colors hover:bg-brand-50/40">
              <td className="whitespace-nowrap px-4 py-3.5 font-medium text-brand-700">
                <TicketId id={ticket.id} href={ticketHref?.(ticket.id)} />
              </td>
              <td className="max-w-[18rem] px-4 py-3.5">
                <p className="truncate font-medium text-ink" title={ticket.subject}>
                  {ticket.subject}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-muted" title={ticket.description}>
                  {isAdmin ? `${ticket.category} · ${formatDate(ticket.createdAt)}` : ticket.description}
                </p>
              </td>
              {isAdmin && (
                <td className="hidden px-4 py-3.5 lg:table-cell">
                  <p className="whitespace-nowrap text-ink">{ticket.requesterName}</p>
                  <p className="text-xs text-ink-subtle">{ticket.requesterEmail}</p>
                </td>
              )}
              {!isAdmin && <td className="hidden px-4 py-3.5 text-ink-muted lg:table-cell">{ticket.category}</td>}
              <td className="hidden px-4 py-3.5 xl:table-cell">
                <PriorityBadge priority={ticket.priority} />
              </td>
              <td className="px-4 py-3.5">
                {adminActions ? <AssignSelect ticket={ticket} actions={adminActions} /> : <AssigneeName ticket={ticket} />}
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={ticket.status} />
              </td>
              {adminActions ? (
                <td className="px-4 py-3.5 text-right">
                  <ResolveCell ticket={ticket} actions={adminActions} />
                </td>
              ) : (
                <td className="whitespace-nowrap px-4 py-3.5 text-ink-muted">{formatDate(ticket.createdAt)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* < md : cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {sorted.map((ticket) => (
          <li key={ticket.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-brand-700">
                <TicketId id={ticket.id} href={ticketHref?.(ticket.id)} />
              </span>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="mt-1.5 text-sm font-medium text-ink">{ticket.subject}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {isAdmin && `${ticket.requesterName} · `}
              {ticket.category} · {ticket.priority} priority · {formatDate(ticket.createdAt)}
            </p>
            {adminActions ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <AssignSelect ticket={ticket} actions={adminActions} />
                <ResolveCell ticket={ticket} actions={adminActions} />
              </div>
            ) : (
              <p className="mt-1 text-xs text-ink-muted">
                Assigned to: <AssigneeName ticket={ticket} />
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
