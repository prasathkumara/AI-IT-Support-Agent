// Login hero illustration: an employee at their desk chatting with the AI
// assistant, with floating chat cards that end in an "issue resolved" check.
import { useId } from "react";

export function LoginIllustration({ className }: { className?: string }) {
  const id = useId();
  const g = (name: string) => `${id}-${name}`;

  return (
    <svg viewBox="0 0 520 420" className={className} role="img" aria-labelledby={g("title")}>
      <title id={g("title")}>An employee getting help from the AI IT support assistant</title>
      <defs>
        <radialGradient id={g("glow")} cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="#dbe8fe" />
          <stop offset="1" stopColor="#dbe8fe" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g("shirt")} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#4f8bff" />
          <stop offset="1" stopColor="#2557eb" />
        </linearGradient>
        <linearGradient id={g("laptop")} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e9eef8" />
          <stop offset="1" stopColor="#c9d4e8" />
        </linearGradient>
        <filter id={g("shadow")} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1e358a" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* soft background */}
      <circle cx="260" cy="215" r="200" fill={`url(#${g("glow")})`} />
      <circle cx="260" cy="225" r="150" fill="#eaf1ff" />
      <ellipse cx="260" cy="388" rx="190" ry="14" fill="#dfe8fb" />

      {/* chair back */}
      <rect x="198" y="168" width="124" height="150" rx="26" fill="#c6d6f5" />

      {/* person */}
      <path d="M196 300c0-52 28-86 64-86s64 34 64 86z" fill={`url(#${g("shirt")})`} />
      <path d="M246 214h28l-14 22z" fill="#fff" opacity="0.9" />
      <rect x="250" y="190" width="20" height="26" rx="8" fill="#e9b48f" />
      <circle cx="260" cy="168" r="31" fill="#f1c39f" />
      <path d="M229 166c-2-24 14-38 33-38 20 0 33 14 31 34-6-9-14-15-26-16-9 8-24 14-38 20z" fill="#2b2f4a" />
      <circle cx="249" cy="172" r="2.6" fill="#2b2f4a" />
      <circle cx="271" cy="172" r="2.6" fill="#2b2f4a" />
      <path d="M252 183c4 4 12 4 16 0" stroke="#b5735a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="243" cy="181" r="4" fill="#f4a9a0" opacity="0.5" />
      <circle cx="277" cy="181" r="4" fill="#f4a9a0" opacity="0.5" />

      {/* desk */}
      <rect x="96" y="292" width="328" height="14" rx="7" fill="#9fb4dc" />
      <rect x="120" y="306" width="10" height="80" rx="4" fill="#b7c7e6" />
      <rect x="390" y="306" width="10" height="80" rx="4" fill="#b7c7e6" />

      {/* hands */}
      <ellipse cx="206" cy="288" rx="13" ry="7" fill="#f1c39f" />
      <ellipse cx="314" cy="288" rx="13" ry="7" fill="#f1c39f" />

      {/* laptop (back of the screen faces us) */}
      <path d="M204 212h112a6 6 0 0 1 6 6v68H198v-68a6 6 0 0 1 6-6z" fill={`url(#${g("laptop")})`} />
      <rect x="186" y="286" width="148" height="7" rx="3.5" fill="#aebbd6" />
      <rect x="248" y="238" width="24" height="24" rx="7" fill="#2557eb" />
      <path d="M254 248a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3.5a3 3 0 0 1-3 3h-3.5l-3 2.5v-2.6a3 3 0 0 1-2.5-2.9z" fill="#fff" />

      {/* plant */}
      <rect x="128" y="262" width="26" height="30" rx="6" fill="#ffffff" stroke="#c6d6f5" strokeWidth="2" />
      <path d="M141 262c-14-10-18-24-12-34 10 6 14 18 12 34z" fill="#6fd0ad" />
      <path d="M141 262c12-12 22-16 28-12-4 10-14 14-28 12z" fill="#34b98b" />
      <path d="M141 262c0-14 4-26 10-30 4 10 0 22-10 30z" fill="#a7e5d0" />

      {/* mug */}
      <rect x="360" y="266" width="24" height="26" rx="5" fill="#ffffff" stroke="#c6d6f5" strokeWidth="2" />
      <path d="M384 272h4a5 5 0 0 1 0 10h-4" stroke="#c6d6f5" strokeWidth="3" fill="none" />
      <path d="M368 258c0-4 4-4 4-8M376 258c0-4 4-4 4-8" stroke="#bfd6fe" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* AI assistant message card */}
      <g filter={`url(#${g("shadow")})`}>
        <rect x="24" y="74" width="182" height="74" rx="16" fill="#ffffff" />
      </g>
      <circle cx="54" cy="104" r="16" fill="#2557eb" />
      <rect x="45" y="97" width="18" height="14" rx="5" fill="#fff" />
      <circle cx="50.5" cy="104" r="1.8" fill="#2557eb" />
      <circle cx="57.5" cy="104" r="1.8" fill="#2557eb" />
      <rect x="80" y="92" width="104" height="8" rx="4" fill="#dbe8fe" />
      <rect x="80" y="106" width="80" height="8" rx="4" fill="#eaf1ff" />
      <rect x="80" y="124" width="54" height="12" rx="6" fill="#2557eb" opacity="0.12" />

      {/* employee message card */}
      <g filter={`url(#${g("shadow")})`}>
        <rect x="330" y="46" width="164" height="54" rx="16" fill="#2557eb" />
      </g>
      <rect x="348" y="62" width="112" height="8" rx="4" fill="#ffffff" opacity="0.9" />
      <rect x="348" y="76" width="72" height="8" rx="4" fill="#ffffff" opacity="0.55" />
      <path d="M470 100l10 12 2-12z" fill="#2557eb" />

      {/* resolved card */}
      <g filter={`url(#${g("shadow")})`}>
        <rect x="346" y="168" width="150" height="56" rx="16" fill="#ffffff" />
      </g>
      <circle cx="374" cy="196" r="14" fill="#d1f4e5" />
      <path d="M367 196l5 5 9-10" stroke="#0f9f74" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="396" y="186" width="78" height="8" rx="4" fill="#a7e5d0" />
      <rect x="396" y="200" width="54" height="8" rx="4" fill="#e3f7f1" />

      {/* sparkles */}
      <path d="M232 52l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#6098fa" />
      <path d="M86 196l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#93bbfd" />
      <circle cx="462" cy="262" r="5" fill="#bfd6fe" />
      <circle cx="300" cy="70" r="4" fill="#7dd3fc" />
    </svg>
  );
}
