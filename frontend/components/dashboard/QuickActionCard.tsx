// QuickActionCard — a large clickable card linking to a key area of the app.
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

export function QuickActionCard({ title, description, href, icon }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="card group flex items-start gap-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-base font-semibold text-ink">{title}</span>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
            aria-hidden="true"
          />
        </span>
        <span className="mt-1 block text-sm text-ink-muted">{description}</span>
      </span>
    </Link>
  );
}
