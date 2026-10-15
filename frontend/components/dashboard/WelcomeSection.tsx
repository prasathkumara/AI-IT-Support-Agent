// WelcomeSection — personalised greeting banner at the top of the dashboard.
import { CalendarDays, Sparkles } from "lucide-react";
import Link from "next/link";

import { WelcomeIllustration } from "@/components/illustrations/WelcomeIllustration";
import { firstName, formatLongDate, greetingFor } from "@/lib/utils";

export function WelcomeSection({ name, today }: { name: string; today: Date }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-[#4f9dff] px-6 py-7 text-white shadow-card sm:px-8 sm:py-8">
      <div aria-hidden="true" className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute -bottom-20 right-40 h-44 w-44 rounded-full bg-white/10" />

      <div className="relative flex items-center justify-between gap-6">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatLongDate(today)}
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greetingFor(today)}, {firstName(name)}!
          </h1>
          <p className="mt-2 text-sm text-white/85 sm:text-base">
            Welcome to AI IT Support. Describe any IT issue and get a solution in seconds — no waiting in a
            queue.
          </p>
          <Link
            href="/ai-support"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Ask AI Support
          </Link>
        </div>
        <WelcomeIllustration className="hidden h-44 w-auto shrink-0 sm:block lg:h-48" />
      </div>
    </section>
  );
}
