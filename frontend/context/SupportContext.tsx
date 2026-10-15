"use client";

// SupportContext — the single source of shared client state for the prototype.
//
// New concept: React Context. Context lets any component read shared state
// without passing props through every level. Here it holds the simulated
// signed-in user, the ticket list and the activity feed, so a ticket
// confirmed in the chatbot immediately shows up on the dashboard.
//
// Roles: an "employee" only sees their own tickets (`myTickets`) and is the
// only one who creates tickets. An "admin" sees every ticket (`tickets`),
// assigns it to any IT admin (Open → In Progress) and resolves it.
//
// Everything is persisted to localStorage so a page refresh keeps you signed
// in and keeps tickets created during the session. `hydrated` is false until
// localStorage has been read, which lets pages avoid flashing the wrong UI.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { mockActivity, mockAdmins, mockEmployee, mockTickets } from "@/data/mock-tickets";
import { createId, nameFromEmail } from "@/lib/utils";
import type { ActivityItem, Employee, Ticket, TicketDraft, UserRole } from "@/types";

// The version prefix is bumped whenever the stored shapes change (v3: tickets
// gained assignees), so data saved by an older build is ignored, not mis-read.
const STORAGE_KEYS = {
  session: "aits.v3.session",
  tickets: "aits.v3.tickets",
  activity: "aits.v3.activity",
} as const;

/** Where each role lands after signing in. */
export function homePathFor(role: UserRole): string {
  return role === "admin" ? "/admin" : "/dashboard";
}

interface SupportContextValue {
  hydrated: boolean;
  user: Employee | null;
  /** Every ticket in the system — what the IT admin works from. */
  tickets: Ticket[];
  /** Only the signed-in user's own tickets — what an employee sees. */
  myTickets: Ticket[];
  /** Activity relevant to the signed-in user. */
  activity: ActivityItem[];
  /** The IT admins a ticket can be assigned to. */
  admins: Employee[];
  /** Signs in. IT admin emails get the admin portal; every other email is an employee. */
  login: (email: string) => Employee;
  logout: () => void;
  addTicket: (draft: TicketDraft) => Ticket;
  /** Admin only: give a ticket to an IT admin. An Open ticket moves to In Progress. */
  assignTicket: (id: string, adminEmail: string) => void;
  /** Admin only: close a ticket. Unassigned tickets are assigned to the resolver. */
  resolveTicket: (id: string) => void;
}

const SupportContext = createContext<SupportContextValue | null>(null);

function readStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, quota) — the app still works in memory.
  }
}

export function SupportProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<Employee | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [activity, setActivity] = useState<ActivityItem[]>(mockActivity);

  // Load persisted state once, after the first client render.
  useEffect(() => {
    setUser(readStorage<Employee>(STORAGE_KEYS.session));
    const storedTickets = readStorage<Ticket[]>(STORAGE_KEYS.tickets);
    if (storedTickets) setTickets(storedTickets);
    const storedActivity = readStorage<ActivityItem[]>(STORAGE_KEYS.activity);
    if (storedActivity) setActivity(storedActivity);
    setHydrated(true);
  }, []);

  const login = useCallback((email: string): Employee => {
    const trimmed = email.trim().toLowerCase();
    // The role is decided by the email, never chosen at sign-in: only members of
    // the IT team (mockAdmins) get the admin portal. Any other email signs in as
    // an employee; the demo employee keeps their profile, others get a derived name.
    const account: Employee =
      mockAdmins.find((a) => a.email === trimmed) ??
      (trimmed === mockEmployee.email ? mockEmployee : { ...mockEmployee, email: trimmed, name: nameFromEmail(trimmed) });
    setUser(account);
    writeStorage(STORAGE_KEYS.session, account);
    return account;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    writeStorage(STORAGE_KEYS.session, null);
  }, []);

  const pushActivity = useCallback((item: ActivityItem) => {
    setActivity((prev) => {
      const next = [item, ...prev];
      writeStorage(STORAGE_KEYS.activity, next);
      return next;
    });
  }, []);

  const addTicket = useCallback(
    (draft: TicketDraft): Ticket => {
      const requester = user ?? mockEmployee;
      const ticket: Ticket = {
        ...draft,
        requesterName: requester.name,
        requesterEmail: requester.email,
        createdAt: new Date().toISOString(),
      };
      setTickets((prev) => {
        const next = [ticket, ...prev];
        writeStorage(STORAGE_KEYS.tickets, next);
        return next;
      });
      pushActivity({
        id: createId("act"),
        kind: "ticket-created",
        recipientEmail: ticket.requesterEmail,
        title: `${ticket.id} created`,
        description: `"${ticket.subject}" was sent to the IT team.`,
        createdAt: ticket.createdAt,
      });
      return ticket;
    },
    [user, pushActivity],
  );

  const patchTicket = useCallback((id: string, patch: Partial<Ticket>) => {
    setTickets((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      writeStorage(STORAGE_KEYS.tickets, next);
      return next;
    });
  }, []);

  const assignTicket = useCallback(
    (id: string, adminEmail: string) => {
      const ticket = tickets.find((t) => t.id === id);
      const admin = mockAdmins.find((a) => a.email === adminEmail);
      if (!ticket || !admin || ticket.status === "Resolved" || ticket.assigneeEmail === admin.email) return;
      patchTicket(id, { assigneeName: admin.name, assigneeEmail: admin.email, status: "In Progress" });
      pushActivity({
        id: createId("act"),
        kind: "ticket-update",
        recipientEmail: ticket.requesterEmail,
        title: `${id} assigned to ${admin.name}`,
        description: `${admin.name} from IT is now working on "${ticket.subject}".`,
        createdAt: new Date().toISOString(),
      });
    },
    [tickets, patchTicket, pushActivity],
  );

  const resolveTicket = useCallback(
    (id: string) => {
      const ticket = tickets.find((t) => t.id === id);
      if (!ticket || !user || ticket.status === "Resolved") return;
      patchTicket(id, {
        status: "Resolved",
        resolvedAt: new Date().toISOString(),
        assigneeName: ticket.assigneeName ?? user.name,
        assigneeEmail: ticket.assigneeEmail ?? user.email,
      });
      pushActivity({
        id: createId("act"),
        kind: "ticket-update",
        recipientEmail: ticket.requesterEmail,
        title: `${id} was resolved`,
        description: `${user.name} resolved "${ticket.subject}".`,
        createdAt: new Date().toISOString(),
      });
    },
    [tickets, user, patchTicket, pushActivity],
  );

  const myTickets = useMemo(
    () => (user ? tickets.filter((t) => t.requesterEmail === user.email) : []),
    [tickets, user],
  );

  const visibleActivity = useMemo(
    () => activity.filter((item) => !item.recipientEmail || item.recipientEmail === user?.email),
    [activity, user],
  );

  const value = useMemo<SupportContextValue>(
    () => ({
      hydrated,
      user,
      tickets,
      myTickets,
      activity: visibleActivity,
      admins: mockAdmins,
      login,
      logout,
      addTicket,
      assignTicket,
      resolveTicket,
    }),
    [hydrated, user, tickets, myTickets, visibleActivity, login, logout, addTicket, assignTicket, resolveTicket],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport(): SupportContextValue {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error("useSupport must be used inside <SupportProvider>.");
  }
  return context;
}
