// Local dummy data for the prototype: the demo employee and IT admin, tickets
// raised by several employees, and the recent-activity feed. Nothing here talks to a backend — the shared
// SupportContext loads these as its starting state.
import type { ActivityItem, Employee, Ticket } from "@/types";

export const mockEmployee: Employee = {
  role: "employee",
  name: "Alex Morgan",
  email: "alex.morgan@contoso.com",
  jobTitle: "Product Designer",
  department: "Design",
};

export const mockAdmin: Employee = {
  role: "admin",
  name: "Jordan Lee",
  email: "it.admin@contoso.com",
  jobTitle: "IT Support Lead",
  department: "IT",
};

/** The IT team. Tickets can be assigned to any of these admins. */
export const mockAdmins: Employee[] = [
  mockAdmin,
  {
    role: "admin",
    name: "Priya Shah",
    email: "priya.shah@contoso.com",
    jobTitle: "Network Engineer",
    department: "IT",
  },
  {
    role: "admin",
    name: "Daniel Kim",
    email: "daniel.kim@contoso.com",
    jobTitle: "Desktop Support Specialist",
    department: "IT",
  },
];

const [jordan, priya, daniel] = mockAdmins.map((a) => ({ assigneeName: a.name, assigneeEmail: a.email }));

const alex = { requesterName: mockEmployee.name, requesterEmail: mockEmployee.email };

// Dates are relative to "now" so the dashboard always looks recent.
function daysAgo(days: number, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

export const mockTickets: Ticket[] = [
  {
    ...alex,
    id: "INC-1042",
    subject: "VPN disconnects every few minutes",
    category: "Network",
    status: "In Progress",
    ...priya,
    priority: "High",
    description: "GlobalProtect drops the connection roughly every 5 minutes when working from home.",
    createdAt: daysAgo(1, 9),
  },
  {
    ...alex,
    id: "INC-1039",
    subject: "Request Adobe Illustrator license",
    category: "Software",
    status: "Open",
    priority: "Medium",
    description: "Need an Illustrator license for the new brand refresh project.",
    createdAt: daysAgo(3, 14),
  },
  {
    ...alex,
    id: "INC-1035",
    subject: "Outlook not syncing calendar on phone",
    category: "Email",
    status: "Resolved",
    ...jordan,
    resolvedAt: daysAgo(5, 15),
    priority: "Medium",
    description: "Calendar invites accepted on desktop do not show on the Outlook mobile app.",
    createdAt: daysAgo(6, 11),
  },
  {
    ...alex,
    id: "INC-1031",
    subject: "Cannot print to 3rd floor printer",
    category: "Hardware",
    status: "Resolved",
    ...daniel,
    resolvedAt: daysAgo(8, 12),
    priority: "Low",
    description: "Print jobs to PRN-3F-01 stay queued and never print.",
    createdAt: daysAgo(9, 16),
  },
  {
    ...alex,
    id: "INC-1027",
    subject: "MFA prompt not received",
    category: "Account",
    status: "Resolved",
    ...jordan,
    resolvedAt: daysAgo(13, 10),
    priority: "High",
    description: "Authenticator app stopped receiving push notifications after a phone upgrade.",
    createdAt: daysAgo(14, 8),
  },
  // Tickets from other employees — only the IT admin sees these.
  {
    id: "INC-1040",
    requesterName: "Sam Patel",
    requesterEmail: "sam.patel@contoso.com",
    subject: "Laptop battery drains in under an hour",
    category: "Hardware",
    status: "Open",
    priority: "High",
    description: "Battery health shows 41%. Laptop shuts down unexpectedly when unplugged.",
    createdAt: daysAgo(2, 10),
  },
  {
    id: "INC-1037",
    requesterName: "Maria Gomez",
    requesterEmail: "maria.gomez@contoso.com",
    subject: "Shared mailbox missing from Outlook",
    category: "Email",
    status: "In Progress",
    ...daniel,
    priority: "Medium",
    description: "The finance@ shared mailbox disappeared from Outlook after the latest update.",
    createdAt: daysAgo(4, 13),
  },
  {
    id: "INC-1033",
    requesterName: "Chris Wong",
    requesterEmail: "chris.wong@contoso.com",
    subject: "Account locked after password change",
    category: "Account",
    status: "Resolved",
    ...priya,
    resolvedAt: daysAgo(7, 11),
    priority: "High",
    description: "Locked out of all systems after changing password on the web portal.",
    createdAt: daysAgo(8, 9),
  },
];

export const mockActivity: ActivityItem[] = [
  {
    id: "act-1",
    kind: "ticket-update",
    recipientEmail: mockEmployee.email,
    title: "INC-1042 moved to In Progress",
    description: "Priya from Network Ops is looking into your VPN issue.",
    createdAt: daysAgo(0, 8),
  },
  {
    id: "act-2",
    kind: "announcement",
    title: "Scheduled maintenance this Saturday",
    description: "Email services may be briefly unavailable between 10 PM and 11 PM.",
    createdAt: daysAgo(1, 17),
  },
  {
    id: "act-3",
    kind: "ticket-update",
    recipientEmail: mockEmployee.email,
    title: "INC-1035 was resolved",
    description: "Re-adding your account in Outlook mobile fixed the calendar sync.",
    createdAt: daysAgo(5, 15),
  },
  {
    id: "act-4",
    kind: "announcement",
    title: "New: self-service password reset",
    description: "You can now reset your password from the AI Support assistant.",
    createdAt: daysAgo(7, 9),
  },
];
