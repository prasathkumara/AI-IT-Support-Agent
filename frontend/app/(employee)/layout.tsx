// Layout for every employee-facing page in the (employee) route group.
//
// New concept: route groups. A folder name in parentheses, like (employee),
// groups routes so they can share a layout WITHOUT adding to the URL — so
// app/(employee)/dashboard/page.tsx is served at /dashboard.
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return <AppShell role="employee">{children}</AppShell>;
}
