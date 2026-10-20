// CreateTicketConfirmation — shows the locally drafted ticket and asks the
// employee to explicitly confirm before anything is created.
import { Check, TicketPlus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { PriorityBadge, StatusBadge } from "@/components/ui/StatusBadge";
import type { TicketDraft } from "@/types";

interface CreateTicketConfirmationProps {
  draft: TicketDraft;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function CreateTicketConfirmation({ draft, onConfirm, onCancel, submitting = false }: CreateTicketConfirmationProps) {
  return (
    <section
      aria-labelledby="ticket-draft-heading"
      className="w-full animate-fade-in-up overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-card"
    >
      <div className="flex items-center gap-3 border-b border-brand-100 bg-gradient-to-r from-brand-50 to-white px-4 py-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <TicketPlus className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 id="ticket-draft-heading" className="text-sm font-semibold text-ink">
            Review ticket before submitting
          </h3>
          <p className="text-xs text-ink-muted">Nothing is sent until you confirm.</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Status</dt>
          <dd className="mt-1">
            {/* A draft has no id yet; the backend assigns one (e.g. TICKET-1) on confirm.
                New tickets are always created with status "Open". */}
            <StatusBadge status="Open" />
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Issue title</dt>
          <dd className="mt-0.5 font-medium text-ink">{draft.subject}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Category</dt>
          <dd className="mt-0.5 text-ink">{draft.category}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Priority</dt>
          <dd className="mt-1">
            <PriorityBadge priority={draft.priority} />
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Description</dt>
          <dd className="mt-1 whitespace-pre-line rounded-xl bg-surface p-3 text-ink-muted">{draft.description}</dd>
        </div>
      </dl>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          <X className="h-4 w-4" aria-hidden="true" />
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={submitting}>
          {submitting ? (
            <>
              <Spinner label="Creating ticket" className="[&_svg]:text-white" />
              Creating…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Confirm &amp; create ticket
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
