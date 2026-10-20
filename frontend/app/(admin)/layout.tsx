// Layout for every IT-admin page in the (admin) route group.
//
// AppShell's role guard sends employees who open an /admin URL back to their
// own dashboard, and signed-out visitors to /login.
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AppShell role="admin">{children}</AppShell>;
}
