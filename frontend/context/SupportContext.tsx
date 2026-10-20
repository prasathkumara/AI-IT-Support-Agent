"use client";

// SupportContext — the single source of shared client state for the app.
//
// New concept: React Context. Context lets any component read shared state
// without passing props through every level. Here it holds the simulated
// signed-in user, the ticket lists and the activity feed.
//
// INTEGRATION STATUS (employee ticket slice):
//   - EMPLOYEE tickets are now REAL: `myTickets` is loaded from the backend for
//     the signed-in employee, and `addTicket` creates a ticket via the API.
//   - ADMIN data is still MOCK: `tickets` (every ticket), `assignTicket`,
//     `resolveTicket` and the `activity` feed stay on mock/localStorage until
//     their backend endpoints exist. So a ticket an employee creates via the
//     API will NOT appear in the admin views yet — that is expected for this
//     slice and resolves once the admin endpoints are built.
//
// Roles: an "employee" sees their own tickets (`myTickets`); an "admin" sees
// every ticket (`tickets`) and manages them.
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
import { ApiError, createTicket, listEmployeeTickets } from "@/lib/api";
import { createId, nameFromEmail } from "@/lib/utils";
import type { ActivityItem, Employee, Ticket, TicketDraft, UserRole } from "@/types";

// The version prefix is bumped whenever the stored shapes change.
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
  /** Every ticket in the system — what the IT admin works from (still mock). */
  tickets: Ticket[];
  /** The signed-in employee's own tickets — loaded from the backend. */
  myTickets: Ticket[];
  /** True while the employee's tickets are being fetched from the backend. */
  myTicketsLoading: boolean;
  /** Activity relevant to the signed-in user (still mock). */
  activity: ActivityItem[];
  /** The IT admins a ticket can be assigned to (still mock). */
  admins: Employee[];
  login: (email: string) => Employee;
  logout: () => void;
  /** Create a ticket via the backend. Async because it calls the API. */
  addTicket: (draft: TicketDraft) => Promise<Ticket>;
  /** Admin only (still mock): assign a ticket to an IT admin. */
  assignTicket: (id: string, adminEmail: string) => void;
  /** Admin only (still mock): close a ticket. */
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
    // Storage can be unavailable (private mode, quota) — app still works in memory.
  }
}

export function SupportProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<Employee | null>(null);
  // ADMIN tickets + activity stay on mock for now.
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [activity, setActivity] = useState<ActivityItem[]>(mockActivity);
  // EMPLOYEE tickets come from the backend.
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [myTicketsLoading, setMyTicketsLoading] = useState(false);

  // Load persisted state once, after the first client render.
  useEffect(() => {
    setUser(readStorage<Employee>(STORAGE_KEYS.session));
    const storedActivity = readStorage<ActivityItem[]>(STORAGE_KEYS.activity);
    if (storedActivity) setActivity(storedActivity);
    setHydrated(true);
  }, []);

  // Whenever we have a signed-in employee, (re)load THEIR tickets from the API.
  // Admins don't use myTickets, so we only fetch for employees.
  useEffect(() => {
    if (!user || user.role !== "employee") {
      setMyTickets([]);
      return;
    }
    let cancelled = false;
    setMyTicketsLoading(true);
    listEmployeeTickets(user.email)
      .then((list) => {
        if (!cancelled) setMyTickets(list);
      })
      .catch(() => {
        // On failure (backend down), fall back to an empty list rather than crash.
        if (!cancelled) setMyTickets([]);
      })
      .finally(() => {
        if (!cancelled) setMyTicketsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const login = useCallback((email: string): Employee => {
    const trimmed = email.trim().toLowerCase();
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

  // Create a ticket on the backend, then add the REAL returned ticket (with its
  // server-generated id like TICKET-1) to the employee's list.
  const addTicket = useCallback(
    async (draft: TicketDraft): Promise<Ticket> => {
      const requester = user ?? mockEmployee;
      const created = await createTicket({
        requester_name: requester.name,
        requester_email: requester.email,
        subject: draft.subject,
        description: draft.description,
        category: draft.category,
        priority: draft.priority,
      });
      // Prepend so the newest ticket shows first, matching the list order.
      setMyTickets((prev) => [created, ...prev]);
      pushActivity({
        id: createId("act"),
        kind: "ticket-created",
        recipientEmail: created.requesterEmail,
        title: `${created.id} created`,
        description: `"${created.subject}" was sent to the IT team.`,
        createdAt: created.createdAt,
      });
      return created;
    },
    [user, pushActivity],
  );

  // --- ADMIN actions below are UNCHANGED (still mock) ----------------------
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
      myTicketsLoading,
      activity: visibleActivity,
      admins: mockAdmins,
      login,
      logout,
      addTicket,
      assignTicket,
      resolveTicket,
    }),
    [hydrated, user, tickets, myTickets, myTicketsLoading, visibleActivity, login, logout, addTicket, assignTicket, resolveTicket],
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
