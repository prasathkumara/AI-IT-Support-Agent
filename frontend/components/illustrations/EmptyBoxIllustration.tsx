// Light illustration for empty lists and placeholder pages: an open box with
// a few sparkles floating out of it.
export function EmptyBoxIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <ellipse cx="80" cy="106" rx="56" ry="7" fill="#e3ecff" />
      <path d="M38 52l42-14 42 14v42l-42 14-42-14z" fill="#dbe8fe" />
      <path d="M80 66v42l42-14V52z" fill="#bfd6fe" />
      <path d="M38 52l42 14 42-14" fill="none" stroke="#93bbfd" strokeWidth="2" strokeLinejoin="round" />
      <path d="M38 52l-12 16 42 14 12-16z" fill="#eef4ff" stroke="#bfd6fe" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M122 52l12 16-42 14-12-16z" fill="#eef4ff" stroke="#bfd6fe" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M80 20v8M76 24h8" stroke="#6098fa" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M58 12v6M55 15h6" stroke="#93bbfd" strokeWidth="2" strokeLinecap="round" />
      <path d="M104 14v6M101 17h6" stroke="#93bbfd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="95" cy="34" r="2.5" fill="#7dd3fc" />
      <circle cx="66" cy="34" r="2" fill="#bfd6fe" />
    </svg>
  );
}
