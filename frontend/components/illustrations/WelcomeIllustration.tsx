// Dashboard welcome-banner illustration: a laptop showing the AI assistant,
// with a shield, gear and chat bubbles floating around it.
import { useId } from "react";

export function WelcomeIllustration({ className }: { className?: string }) {
  const id = useId();
  const g = (name: string) => `${id}-${name}`;

  return (
    <svg viewBox="0 0 280 190" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={g("screen")} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#eaf1ff" />
        </linearGradient>
        <linearGradient id={g("bot")} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5b93ff" />
          <stop offset="1" stopColor="#2048d8" />
        </linearGradient>
      </defs>

      <ellipse cx="140" cy="174" rx="112" ry="10" fill="#ffffff" opacity="0.35" />

      {/* laptop */}
      <rect x="62" y="40" width="156" height="104" rx="10" fill="#1e358a" />
      <rect x="70" y="48" width="140" height="88" rx="5" fill={`url(#${g("screen")})`} />
      <path d="M44 146h192l-10 16H54z" fill="#dbe8fe" />
      <rect x="120" y="146" width="40" height="5" rx="2.5" fill="#bfd6fe" />

      {/* bot on screen */}
      <circle cx="104" cy="82" r="20" fill={`url(#${g("bot")})`} />
      <rect x="93" y="74" width="22" height="17" rx="6" fill="#fff" />
      <circle cx="99.5" cy="82.5" r="2.2" fill="#1d44d8" />
      <circle cx="108.5" cy="82.5" r="2.2" fill="#1d44d8" />
      <path d="M104 62v-4" stroke="#2557eb" strokeWidth="2" strokeLinecap="round" />
      <circle cx="104" cy="56.5" r="2.4" fill="#7dd3fc" />

      {/* chat lines on screen */}
      <rect x="134" y="66" width="62" height="20" rx="8" fill="#dbe8fe" />
      <rect x="140" y="73" width="44" height="5" rx="2.5" fill="#93bbfd" />
      <rect x="146" y="94" width="50" height="18" rx="8" fill="#2557eb" />
      <rect x="152" y="100.5" width="32" height="5" rx="2.5" fill="#ffffff" opacity="0.85" />
      <rect x="84" y="114" width="54" height="12" rx="6" fill="#e3f7f1" />
      <circle cx="92" cy="120" r="3.2" fill="#0f9f74" />
      <rect x="99" y="118" width="32" height="4" rx="2" fill="#6fd0ad" />

      {/* shield */}
      <path d="M232 26l20 8v14c0 12-8.5 22-20 26-11.5-4-20-14-20-26V34z" fill="#ffffff" />
      <path d="M223 49l6.5 6.5 12-13" stroke="#0f9f74" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* gear */}
      <g transform="translate(30 58)">
        <circle r="15" fill="#ffffff" opacity="0.9" />
        <path
          d="M0-11l2.4.4.9 3 2.8 1.2 2.7-1.6 1.7 1.7-1.6 2.7 1.2 2.8 3 .9.4 2.4-.4 2.4-3 .9-1.2 2.8 1.6 2.7-1.7 1.7-2.7-1.6-2.8 1.2-.9 3L0 11l-2.4-.4-.9-3-2.8-1.2-2.7 1.6-1.7-1.7 1.6-2.7-1.2-2.8-3-.9L-11 0l.4-2.4 3-.9 1.2-2.8-1.6-2.7 1.7-1.7 2.7 1.6 2.8-1.2.9-3z"
          fill="#93bbfd"
        />
        <circle r="4" fill="#ffffff" />
      </g>

      {/* floating bubble */}
      <path d="M232 104h28a8 8 0 0 1 8 8v10a8 8 0 0 1-8 8h-18l-8 7v-7h-2a8 8 0 0 1-8-8v-10a8 8 0 0 1 8-8z" fill="#ffffff" />
      <circle cx="238" cy="117" r="2.6" fill="#6098fa" />
      <circle cx="246" cy="117" r="2.6" fill="#6098fa" />
      <circle cx="254" cy="117" r="2.6" fill="#6098fa" />

      {/* sparkles */}
      <path d="M44 18l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#ffffff" />
      <path d="M186 14l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" fill="#ffffff" opacity="0.8" />
      <circle cx="20" cy="120" r="4" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}
