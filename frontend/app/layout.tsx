// layout.tsx is a special App Router file: it is the shared shell that WRAPS
// every page in the app. Whatever a page returns is passed in here as `children`
// and rendered inside <body>. Because it wraps everything, this is the natural
// place to import global styles once and to declare page metadata.
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SupportProvider } from "@/context/SupportContext";

import "./globals.css";

// Next.js reads this exported `metadata` object to set things like the browser
// tab title (Requirement 2.2 — the platform name).
export const metadata: Metadata = {
  title: "AI IT Support Platform",
  description: "AI-first IT support for employees.",
};

export const viewport: Viewport = {
  themeColor: "#2557eb",
};

// The root layout must render the <html> and <body> tags itself. `children` is
// the page being shown for the current route. SupportProvider makes the shared
// session + ticket state available to every page.
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SupportProvider>{children}</SupportProvider>
      </body>
    </html>
  );
}
