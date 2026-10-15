// TicketSummary — four stat cards (Total / Open / In Progress / Resolved)
// computed from the shared ticket list, so they update as tickets are created.
import { CheckCircle2, CircleDot, Layers, Loader } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Ticket } from "@/types";

interface Stat {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
}

export function TicketSummary({ tickets }: { tickets: Ticket[] }) {
  const count = (status: Ticket["status"]) => tickets.filter((t) => t.status === status).length;

  const stats: Stat[] = [
    { label: "Total tickets", value: tickets.length, icon: Layers, tone: "bg-slate-100 text-slate-700" },
    { label: "Open", value: count("Open"), icon: CircleDot, tone: "bg-amber-50 text-amber-600" },
    { label: "In Progress", value: count("In Progress"), icon: Loader, tone: "bg-brand-50 text-brand-600" },
    { label: "Resolved", value: count("Resolved"), icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <ul aria-label="Ticket summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, tone }) => (
        <li key={label} className="card flex items-center gap-3 p-4">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-semibold leading-none text-ink" data-testid={`stat-${label}`}>
              {value}
            </span>
            <span className="mt-1 block truncate text-xs font-medium text-ink-muted">{label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
