"use client";

// app/page.tsx maps to the "/" route. There is no landing page in this phase,
// so it simply sends the visitor to the right place: their role's home page if
// a simulated session exists in localStorage, otherwise the login screen.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { homePathFor, useSupport } from "@/context/SupportContext";

export default function HomePage() {
  const router = useRouter();
  const { hydrated, user } = useSupport();

  useEffect(() => {
    if (hydrated) router.replace(user ? homePathFor(user.role) : "/login");
  }, [hydrated, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="sr-only">AI IT Support Platform</h1>
      <Spinner label="Loading AI IT Support" />
    </main>
  );
}
