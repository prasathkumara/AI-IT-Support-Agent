// Duotone icons for the popular troubleshooting topics and the dashboard
// quick actions. Each icon is drawn on a 40×40 grid with a pale tile behind it
// so they read well at small sizes and match the soft, light theme.
import type { ReactElement } from "react";

import type { TopicId } from "@/types";
import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

function Tile({ className, fill, children }: IconProps & { fill: string; children: ReactElement | ReactElement[] }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-11 w-11 shrink-0", className)} aria-hidden="true">
      <rect width="40" height="40" rx="12" fill={fill} />
      {children}
    </svg>
  );
}

export function VpnIcon({ className }: IconProps) {
  return (
    <Tile className={className} fill="#e6efff">
      <path d="M20 9l9 3.5v6.3c0 5.6-3.8 10.2-9 12.2-5.2-2-9-6.6-9-12.2v-6.3z" fill="#bfd6fe" />
      <path d="M20 9l9 3.5v6.3c0 5.6-3.8 10.2-9 12.2" fill="#93bbfd" />
      <rect x="15.5" y="18.5" width="9" height="7" rx="1.8" fill="#2557eb" />
      <path d="M17.5 18.5v-1.8a2.5 2.5 0 0 1 5 0v1.8" stroke="#2557eb" strokeWidth="1.6" fill="none" />
      <circle cx="20" cy="22" r="1.1" fill="#fff" />
    </Tile>
  );
}

export function PasswordIcon({ className }: IconProps) {
  return (
    <Tile className={className} fill="#fff4e5">
      <circle cx="15.5" cy="20" r="6" fill="#fdc77a" />
      <circle cx="15.5" cy="20" r="2.2" fill="#fff4e5" />
      <path d="M21 20h10v3.5M27 20v3" stroke="#e8890c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M11 13.5a8 8 0 0 1 6-2.3" stroke="#e8890c" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </Tile>
  );
}

export function SoftwareIcon({ className }: IconProps) {
  return (
    <Tile className={className} fill="#ece9ff">
      <rect x="10" y="11" width="20" height="16" rx="3" fill="#c9c1ff" />
      <path d="M10 15h20" stroke="#7c6cf2" strokeWidth="1.6" />
      <circle cx="12.6" cy="13" r="0.9" fill="#7c6cf2" />
      <circle cx="15.2" cy="13" r="0.9" fill="#7c6cf2" />
      <path d="M20 17.5v6M17.2 21l2.8 2.8 2.8-2.8" stroke="#5b47e0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="14" y="29" width="12" height="2.2" rx="1.1" fill="#c9c1ff" />
    </Tile>
  );
}

export function EmailIcon({ className }: IconProps) {
  return (
    <Tile className={className} fill="#e3f7f1">
      <rect x="9.5" y="12.5" width="21" height="15" rx="3" fill="#a7e5d0" />
      <path d="M10.5 14l9.5 7 9.5-7" stroke="#0f9f74" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="29" cy="12.5" r="4" fill="#0f9f74" stroke="#e3f7f1" strokeWidth="1.5" />
      <path d="M27.6 12.5l1 1 1.8-1.9" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Tile>
  );
}

export function PrinterIcon({ className }: IconProps) {
  return (
    <Tile className={className} fill="#e5f3fb">
      <rect x="14" y="9.5" width="12" height="7" rx="1.5" fill="#fff" stroke="#55a8d6" strokeWidth="1.4" />
      <rect x="9.5" y="15.5" width="21" height="11" rx="3" fill="#9fd2ee" />
      <rect x="14" y="22.5" width="12" height="8.5" rx="1.5" fill="#fff" stroke="#55a8d6" strokeWidth="1.4" />
      <path d="M16.5 26h7M16.5 28.4h4.5" stroke="#55a8d6" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="27" cy="19" r="1.1" fill="#1f7bb0" />
    </Tile>
  );
}

export function ChatBubbleIcon({ className }: IconProps) {
  return (
    <Tile className={className} fill="#e6efff">
      <path d="M10 14a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-7l-5 4v-4.2A4 4 0 0 1 10 22z" fill="#93bbfd" />
      <circle cx="15.5" cy="18" r="1.5" fill="#fff" />
      <circle cx="20" cy="18" r="1.5" fill="#fff" />
      <circle cx="24.5" cy="18" r="1.5" fill="#fff" />
      <path d="M29 7.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="#2557eb" />
    </Tile>
  );
}

export function TicketIcon({ className }: IconProps) {
  return (
    <Tile className={className} fill="#fff4e5">
      <path
        d="M9.5 14a2 2 0 0 1 2-2h17a2 2 0 0 1 2 2v3a3 3 0 0 0 0 6v3a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2v-3a3 3 0 0 0 0-6z"
        fill="#fdc77a"
      />
      <path d="M24 13v14" stroke="#fff4e5" strokeWidth="1.4" strokeDasharray="2 2" />
      <path d="M14 17.5h6M14 21h4" stroke="#b86a06" strokeWidth="1.6" strokeLinecap="round" />
    </Tile>
  );
}

export function KnowledgeIcon({ className }: IconProps) {
  return (
    <Tile className={className} fill="#e3f7f1">
      <path d="M10 12.5c3.5-1.3 7-1 10 1v15c-3-2-6.5-2.3-10-1z" fill="#a7e5d0" />
      <path d="M30 12.5c-3.5-1.3-7-1-10 1v15c3-2 6.5-2.3 10-1z" fill="#6fd0ad" />
      <path d="M13 16.5c1.8-.4 3.5-.2 5 .5M13 20c1.8-.4 3.5-.2 5 .5" stroke="#0f9f74" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M22 17c1.5-.7 3.2-.9 5-.5M22 20.5c1.5-.7 3.2-.9 5-.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </Tile>
  );
}

export const topicIcons: Record<TopicId, (props: IconProps) => ReactElement> = {
  vpn: VpnIcon,
  password: PasswordIcon,
  software: SoftwareIcon,
  email: EmailIcon,
  printer: PrinterIcon,
};
