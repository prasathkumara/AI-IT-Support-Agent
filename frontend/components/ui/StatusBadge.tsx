// StatusBadge — colored pill for ticket status and priority.
// Green = resolved, orange = open, blue = in progress.
import type { TicketPriority, TicketStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusClasses: Record<TicketStatus, string> = {
  Open: "bg-amber-50 text-amber-800 ring-amber-200",
  "In Progress": "bg-brand-50 text-brand-700 ring-brand-200",
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const statusDot: Record<TicketStatus, string> = {
  Open: "bg-amber-500",
  "In Progress": "bg-brand-500",
  Resolved: "bg-emerald-500",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusClasses[status],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[status])} aria-hidden="true" />
      {status}
    </span>
  );
}

const priorityClasses: Record<TicketPriority, string> = {
  High: "bg-rose-50 text-rose-700 ring-rose-200",
  Medium: "bg-amber-50 text-amber-800 ring-amber-200",
  Low: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        priorityClasses[priority],
      )}
    >
      {priority}
    </span>
  );
}
