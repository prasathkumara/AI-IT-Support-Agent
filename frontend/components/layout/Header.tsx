"use client";

// Header — top bar with the mobile menu button, a search/ask box, the
// notifications shortcut and the profile menu.
//
// For employees the search box doubles as an "ask the AI" entry point:
// submitting it opens AI Support with the text as the first question. For the
// IT admin it searches all tickets instead.
import { Bell, ChevronDown, LogOut, Menu, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { useSupport } from "@/context/SupportContext";
import { cn } from "@/lib/utils";

function ProfileMenu() {
  const router = useRouter();
  const { user, logout } = useSupport();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-slate-100"
      >
        <Avatar name={user.name} />
        <span className="hidden text-left leading-tight lg:block">
          <span className="block text-sm font-medium text-ink">{user.name}</span>
          <span className="block text-xs text-ink-subtle">{user.jobTitle}</span>
        </span>
        <ChevronDown className={cn("hidden h-4 w-4 text-ink-subtle transition-transform sm:block", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-2 shadow-card-hover"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-3 pb-3 pt-2">
            <Avatar name={user.name} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-subtle">{user.email}</p>
            </div>
          </div>
          {user.role === "employee" && (
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink hover:bg-slate-50"
            >
              <UserRound className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
              My profile
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const { user } = useSupport();
  const isAdmin = user?.role === "admin";
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setQuery("");
    const target = isAdmin ? "/admin/tickets" : "/ai-support";
    router.push(`${target}?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-ink-muted hover:bg-slate-100 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <form role="search" onSubmit={handleSearch} className="min-w-0 flex-1 md:max-w-md">
          <label htmlFor="global-search" className="sr-only">
            {isAdmin ? "Search all tickets" : "Search or ask the AI a question"}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAdmin ? "Search tickets by ID, subject or employee…" : "Search or ask a question…"}
              className="h-10 w-full rounded-xl border border-slate-200 bg-surface pl-10 pr-3 text-sm text-ink placeholder:text-ink-subtle transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {!isAdmin && (
            <Link
              href="/notifications"
              className="relative rounded-xl p-2.5 text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink"
              aria-label="Notifications, 2 unread"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" aria-hidden="true" />
            </Link>
          )}
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
