// RecentActivity — a timeline of ticket updates and IT announcements.
import { Megaphone, RefreshCw, TicketPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelative } from "@/lib/utils";
import type { ActivityItem, ActivityKind } from "@/types";

const kindStyles: Record<ActivityKind, { icon: LucideIcon; tone: string; label: string }> = {
  "ticket-update": { icon: RefreshCw, tone: "bg-brand-50 text-brand-600", label: "Ticket update" },
  "ticket-created": { icon: TicketPlus, tone: "bg-amber-50 text-amber-600", label: "Ticket created" },
  announcement: { icon: Megaphone, tone: "bg-violet-50 text-violet-600", label: "Announcement" },
};

export function RecentActivity({ items, limit = 5 }: { items: ActivityItem[]; limit?: number }) {
  const recent = items.slice(0, limit);

  return (
    <section aria-labelledby="recent-activity-heading" className="card h-full">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 id="recent-activity-heading" className="text-base font-semibold text-ink">
          Recent activity
        </h2>
      </div>
      {recent.length === 0 ? (
        <EmptyState title="All quiet" description="Ticket updates and IT announcements will show up here." />
      ) : (
        <ul className="space-y-1 p-3">
          {recent.map((item) => {
            const { icon: Icon, tone, label } = kindStyles[item.kind];
            return (
              <li key={item.id} className="flex gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface">
                <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{label}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <time dateTime={item.createdAt} className="shrink-0 text-xs text-ink-subtle">
                      {formatRelative(item.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{item.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
