"use client";

// SupportContext — the single source of shared client state for the app.
//
// New concept: React Context. Context lets any component read shared state
// without passing props through every level. Here it holds the simulated
// signed-in user, the ticket lists and the activity feed.
//
// INTEGRATION STATUS:
//   - EMPLOYEE tickets are REAL: `myTickets` loads from the backend for the
//     signed-in employee; `addTicket` creates via the API.
//   - ADMIN tickets are now REAL too: `tickets` (every ticket) loads from the
//     backend for a signed-in admin; `assignTicket` / `resolveTicket` call the
//     backend and update state with the server response.
//   - The `activity` feed is still MOCK (no backend endpoint yet), so the
//     notifications it produces on assign/resolve are local-only for now.
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

import { mockActivity, mockAdmins, mockEmployee } from "@/data/mock-tickets";
import {
  assignTicketApi,
  createTicket,
  listAllTickets,
  listEmployeeTickets,
  resolveTicketApi,
} from "@/lib/api";
import { createId, nameFromEmail } from "@/lib/utils";
import type { ActivityItem, Employee, Ticket, TicketDraft, UserRole } from "@/types";

const STORAGE_KEYS = {
  session: "aits.v3.session",
  activity: "aits.v3.activity",
} as const;

/** Where each role lands after signing in. */
export function homePathFor(role: UserRole): string {
  return role === "admin" ? "/admin" : "/dashboard";
}

interface SupportContextValue {
  hydrated: boolean;
  user: Employee | null;
  /** Every ticket in the system — loaded from the backend for admins. */
  tickets: Ticket[];
  /** True while the admin's all-tickets list is loading from the backend. */
  ticketsLoading: boolean;
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
  /** Create a ticket via the backend. */
  addTicket: (draft: TicketDraft) => Promise<Ticket>;
  /** Admin: assign a ticket to an IT admin (by email). Calls the backend. */
  assignTicket: (id: string, adminEmail: string) => void;
  /** Admin: resolve a ticket. Calls the backend. */
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
  // Tickets now come from the backend. `tickets` = all (admin), `myTickets` = mine.
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [myTicketsLoading, setMyTicketsLoading] = useState(false);
  // Activity feed stays mock for now.
  const [activity, setActivity] = useState<ActivityItem[]>(mockActivity);

  // Load persisted state once, after the first client render.
  useEffect(() => {
    setUser(readStorage<Employee>(STORAGE_KEYS.session));
    const storedActivity = readStorage<ActivityItem[]>(STORAGE_KEYS.activity);
    if (storedActivity) setActivity(storedActivity);
    setHydrated(true);
  }, []);

  // Load the signed-in EMPLOYEE's own tickets from the backend.
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
        if (!cancelled) setMyTickets([]);
      })
      .finally(() => {
        if (!cancelled) setMyTicketsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load ALL tickets from the backend when an ADMIN is signed in.
  useEffect(() => {
    if (!user || user.role !== "admin") {
      setTickets([]);
      return;
    }
    let cancelled = false;
    setTicketsLoading(true);
    listAllTickets()
      .then((list) => {
        if (!cancelled) setTickets(list);
      })
      .catch(() => {
        if (!cancelled) setTickets([]);
      })
      .finally(() => {
        if (!cancelled) setTicketsLoading(false);
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

  // Replace a ticket in BOTH lists with the server-updated version.
  const applyTicketUpdate = useCallback((updated: Ticket) => {
    const swap = (list: Ticket[]) => list.map((t) => (t.id === updated.id ? updated : t));
    setTickets(swap);
    setMyTickets(swap);
  }, []);

  // Create a ticket on the backend, then add the REAL returned ticket.
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
      setMyTickets((prev) => [created, ...prev]);
      // If an admin happens to be viewing, also show it in the all-tickets list.
      setTickets((prev) => [created, ...prev]);
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

  // ADMIN: assign to an IT admin (looked up by email from the admin list).
  // The UI calls this fire-and-forget (like the mock did); we do the async
  // backend call internally and update state with the server response.
  const assignTicket = useCallback(
    (id: string, adminEmail: string) => {
      const ticket = tickets.find((t) => t.id === id);
      const admin = mockAdmins.find((a) => a.email === adminEmail);
      if (!ticket || !admin || ticket.status === "Resolved" || ticket.assigneeEmail === admin.email) return;
      (async () => {
        try {
          const updated = await assignTicketApi(id, admin.name, admin.email);
          applyTicketUpdate(updated);
          pushActivity({
            id: createId("act"),
            kind: "ticket-update",
            recipientEmail: ticket.requesterEmail,
            title: `${id} assigned to ${admin.name}`,
            description: `${admin.name} from IT is now working on "${ticket.subject}".`,
            createdAt: new Date().toISOString(),
          });
        } catch {
          // On failure, leave state unchanged. A toast/error UI could go here.
        }
      })();
    },
    [tickets, applyTicketUpdate, pushActivity],
  );

  // ADMIN: resolve a ticket. The signed-in admin is credited as the resolver.
  const resolveTicket = useCallback(
    (id: string) => {
      const ticket = tickets.find((t) => t.id === id);
      if (!ticket || !user || ticket.status === "Resolved") return;
      (async () => {
        try {
          const updated = await resolveTicketApi(id, user.name, user.email);
          applyTicketUpdate(updated);
          pushActivity({
            id: createId("act"),
            kind: "ticket-update",
            recipientEmail: ticket.requesterEmail,
            title: `${id} was resolved`,
            description: `${user.name} resolved "${ticket.subject}".`,
            createdAt: new Date().toISOString(),
          });
        } catch {
          // On failure, leave state unchanged.
        }
      })();
    },
    [tickets, user, applyTicketUpdate, pushActivity],
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
      ticketsLoading,
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
    [hydrated, user, tickets, ticketsLoading, myTickets, myTicketsLoading, visibleActivity, login, logout, addTicket, assignTicket, resolveTicket],
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

