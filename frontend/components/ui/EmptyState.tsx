// EmptyState — friendly placeholder when a list or page has nothing to show.
import type { ReactNode } from "react";

import { EmptyBoxIllustration } from "@/components/illustrations/EmptyBoxIllustration";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  illustration?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, illustration, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      {illustration ?? <EmptyBoxIllustration className="h-24 w-32" />}
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
