// Spinner — small loading indicator with an accessible label.
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-sm text-ink-muted", className)}>
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
