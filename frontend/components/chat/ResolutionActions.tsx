// ResolutionActions — the "Yes, it works" / "No, still an issue" buttons shown
// after the assistant asks "Did this solve your issue?".
import { ThumbsDown, ThumbsUp } from "lucide-react";

interface ResolutionActionsProps {
  onResolved: () => void;
  onNotResolved: () => void;
  disabled?: boolean;
}

export function ResolutionActions({ onResolved, onNotResolved, disabled }: ResolutionActionsProps) {
  return (
    <div role="group" aria-label="Did this solve your issue?" className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onResolved}
        disabled={disabled}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        <ThumbsUp className="h-4 w-4" aria-hidden="true" />
        Yes, it works
      </button>
      <button
        type="button"
        onClick={onNotResolved}
        disabled={disabled}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
      >
        <ThumbsDown className="h-4 w-4" aria-hidden="true" />
        No, still an issue
      </button>
    </div>
  );
}
