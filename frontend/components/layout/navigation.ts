// Sidebar navigation entries, one list per role. Knowledge Base, Notifications
// and Profile still route to placeholder pages in this phase.
import { Bell, BookOpen, Bot, Home, LayoutDashboard, Ticket, UserRound, type LucideIcon } from "lucide-react";

import type { UserRole } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const employeeNavItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "AI Support", href: "/ai-support", icon: Bot },
  { label: "My Tickets", href: "/tickets", icon: Ticket },
  { label: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/profile", icon: UserRound },
];

const adminNavItems: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "All Tickets", href: "/admin/tickets", icon: Ticket },
];

export function navItemsFor(role: UserRole): NavItem[] {
  return role === "admin" ? adminNavItems : employeeNavItems;
}

export function isActivePath(pathname: string, href: string): boolean {
  // "/admin" is the parent of every admin route, so it only matches exactly.
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
