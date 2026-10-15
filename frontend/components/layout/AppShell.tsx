"use client";

// AppShell — the signed-in frame (sidebar + header + page content).
//
// It also acts as a simple client-side route guard: once localStorage has been
// read, visitors without a simulated session are sent to /login, and signed-in
// users on the other role's pages are sent to their own home page.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { homePathFor, useSupport } from "@/context/SupportContext";
import type { UserRole } from "@/types";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell({ role, children }: { role: UserRole; children: ReactNode }) {
  const router = useRouter();
  const { hydrated, user } = useSupport();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(homePathFor(user.role));
  }, [hydrated, user, role, router]);

  if (!hydrated || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading your workspace" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileNavOpen} onClose={closeMobileNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
