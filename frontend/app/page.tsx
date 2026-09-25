// app/page.tsx maps to the "/" route in the App Router (a page.tsx file becomes
// the page shown at its folder's URL, and this one sits at the app/ root).
// It is a React Server Component by default — no "use client", no state, and no
// data fetching — it simply renders the platform name (Requirement 2.2).
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">AI IT Support Platform</h1>
    </main>
  );
}
