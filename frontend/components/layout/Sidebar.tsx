"use client";

// Sidebar — app navigation.
//
// Responsive behaviour:
//   - desktop (lg+):  full 256px sidebar with labels
//   - tablet (md):    slim 80px icon rail (labels become screen-reader only)
//   - mobile (<md):   hidden; the header's menu button opens it as a drawer
import { Headset, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { Logo, LogoMark } from "@/components/illustrations/Logo";
import { homePathFor, useSupport } from "@/context/SupportContext";
import { cn } from "@/lib/utils";

import { isActivePath, navItemsFor } from "./navigation";

function NavList({ collapsible, onNavigate }: { collapsible: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useSupport();
  const navItems = navItemsFor(user?.role ?? "employee");

  return (
    <nav aria-label="Main" className="mt-6 flex-1">
      <ul className="space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                title={collapsible ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsible && "md:justify-center lg:justify-start",
                  active
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                    : "text-ink-muted hover:bg-brand-50 hover:text-brand-700",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className={cn(collapsible && "md:sr-only lg:not-sr-only")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HelpCard() {
  const { user } = useSupport();
  if (user?.role === "admin") return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-[#e4edff] p-4">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
        <Headset className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">Need urgent help?</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        Call the IT Service Desk at <span className="font-medium text-ink">ext. 4357</span>, 24/7.
      </p>
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { user } = useSupport();
  const homeHref = homePathFor(user?.role ?? "employee");

  // Let Escape close the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onClose]);

  return (
    <>
      {/* Desktop + tablet */}
      <aside className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200/80 bg-white px-3 py-5 md:flex md:w-20 lg:w-64 lg:px-4">
        <Link href={homeHref} className="flex items-center justify-center rounded-xl px-1 lg:justify-start">
          <span className="hidden lg:inline-flex">
            <Logo />
          </span>
          <span className="lg:hidden">
            <LogoMark />
            <span className="sr-only">AI IT Support home</span>
          </span>
        </Link>
        {user?.role === "admin" && (
          <span className="mx-auto mt-4 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700 lg:mx-1 lg:self-start">
            Admin
          </span>
        )}
        <NavList collapsible />
        <div className="hidden lg:block">
          <HelpCard />
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 md:hidden", mobileOpen ? "" : "pointer-events-none")} aria-hidden={!mobileOpen}>
        <div
          className={cn(
            "absolute inset-0 bg-ink/30 backdrop-blur-[2px] transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white px-4 py-5 shadow-xl transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <Logo />
            <button
              type="button"
              onClick={onClose}
              tabIndex={mobileOpen ? 0 : -1}
              className="rounded-lg p-2 text-ink-muted hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {mobileOpen && <NavList collapsible={false} onNavigate={onClose} />}
          <HelpCard />
        </aside>
      </div>
    </>
  );
}
