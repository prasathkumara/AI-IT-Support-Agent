// Application logo: a chat bubble with an AI spark, on a blue gradient tile.
import { useId } from "react";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9 shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f8bff" />
          <stop offset="1" stopColor="#1d44d8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id}-bg)`} />
      <path
        d="M11 14.5A4.5 4.5 0 0 1 15.5 10h9a4.5 4.5 0 0 1 4.5 4.5v6a4.5 4.5 0 0 1-4.5 4.5H19l-5 4v-4.2A4.5 4.5 0 0 1 11 20.5z"
        fill="#fff"
      />
      <path
        d="M20 13.2l1.05 2.75 2.75 1.05-2.75 1.05L20 20.8l-1.05-2.75-2.75-1.05 2.75-1.05z"
        fill="#2557eb"
      />
      <circle cx="29.5" cy="28.5" r="3.5" fill="#7dd3fc" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("text-lg font-semibold tracking-tight text-ink", textClassName)}>
        AI IT <span className="text-brand-600">Support</span>
      </span>
    </span>
  );
}
