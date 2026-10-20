// The AI assistant's avatar: a friendly robot head wearing a support headset.
import { useId } from "react";

import { cn } from "@/lib/utils";

export function BotAvatar({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9 shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b93ff" />
          <stop offset="1" stopColor="#2048d8" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill={`url(#${id}-bg)`} />
      {/* antenna */}
      <path d="M20 9.5v3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="20" cy="8.6" r="1.6" fill="#7dd3fc" />
      {/* head */}
      <rect x="11" y="12.5" width="18" height="15" rx="5.5" fill="#fff" />
      <rect x="13.5" y="16" width="13" height="7.5" rx="3.75" fill="#dbe8fe" />
      <circle cx="17.3" cy="19.75" r="1.5" fill="#1d44d8" />
      <circle cx="22.7" cy="19.75" r="1.5" fill="#1d44d8" />
      {/* headset */}
      <path d="M9.5 21.5v-2a10.5 10.5 0 0 1 21 0v2" stroke="#bfd6fe" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="8" y="18.5" width="3.4" height="6" rx="1.7" fill="#7dd3fc" />
      <rect x="28.6" y="18.5" width="3.4" height="6" rx="1.7" fill="#7dd3fc" />
      <path d="M30.3 24.5c0 3-2.2 5-5.3 5h-2" stroke="#7dd3fc" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="22.4" cy="29.5" r="1.2" fill="#7dd3fc" />
    </svg>
  );
}
