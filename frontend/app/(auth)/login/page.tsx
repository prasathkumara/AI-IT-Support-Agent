"use client";

// /login — split-screen sign-in page.
//
// Sign-in is SIMULATED for this phase: a valid-looking email is saved to
// localStorage by SupportContext.login(). The email decides the role — IT team
// emails open the admin portal, every other email opens the employee portal.
// The Microsoft button is UI only (no OAuth).
import { AlertCircle, ArrowRight, Bot, Clock3, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { LoginIllustration } from "@/components/illustrations/LoginIllustration";
import { Logo } from "@/components/illustrations/Logo";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { homePathFor, useSupport } from "@/context/SupportContext";
import { mockAdmin, mockEmployee } from "@/data/mock-tickets";
import { isValidEmail } from "@/lib/utils";

const demoAccounts = [
  { label: "Employee", email: mockEmployee.email },
  { label: "IT Admin", email: mockAdmin.email },
];

const features = [
  { icon: Bot, title: "Instant AI answers", text: "Get step-by-step fixes for common issues in seconds." },
  { icon: Clock3, title: "Available 24/7", text: "Help whenever you need it — no waiting in a queue." },
  { icon: ShieldCheck, title: "Seamless escalation", text: "Hand off to the IT team with one click when needed." },
];

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="h-5 w-5" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, user, login } = useSupport();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Skip straight to the right home page.
  useEffect(() => {
    if (hydrated && user && !submitting) router.replace(homePathFor(user.role));
  }, [hydrated, user, submitting, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Please enter your work email.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address, e.g. name@company.com.");
      return;
    }
    setError(null);
    setSubmitting(true);
    // Short pause so the loading state is visible, like a real sign-in.
    window.setTimeout(() => {
      const account = login(email);
      router.push(homePathFor(account.role));
    }, 700);
  }

  return (
    <main className="flex min-h-screen flex-col bg-white lg:flex-row">
      {/* Brand panel */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-[#eef4ff] to-[#e4edff] px-6 pb-8 pt-6 sm:px-10 lg:flex lg:w-[55%] lg:flex-col lg:px-14 lg:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl"
        />
        <Logo />
        <div className="relative mt-8 max-w-xl lg:mt-14">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl xl:text-[2.75rem]">
            Smarter support.
            <br />
            <span className="text-brand-600">Happier employees.</span>
          </h1>
          <p className="mt-4 text-base text-ink-muted sm:text-lg">
            Describe your IT issue in plain language and our AI assistant walks you through the fix — or
            hands it to the IT team when you need a human.
          </p>
        </div>

        <ul className="relative mt-8 hidden gap-4 sm:grid sm:grid-cols-3 lg:max-w-2xl">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>

        <div className="relative mt-auto hidden justify-center pt-8 lg:flex">
          <LoginIllustration className="h-auto w-full max-w-[520px]" />
        </div>
      </section>

      {/* Sign-in panel */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h2>
            <p className="mt-1 text-sm text-ink-muted">Sign in to get IT help from your AI assistant.</p>

            <Button
              variant="secondary"
              size="lg"
              className="mt-6 w-full"
              onClick={() =>
                setNotice("Microsoft sign-in isn't connected in this prototype. Continue with your work email below.")
              }
            >
              <MicrosoftLogo />
              Sign in with Microsoft
            </Button>

            {notice && (
              <p role="status" className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs text-brand-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {notice}
              </p>
            )}

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-ink-subtle">
              <span className="h-px flex-1 bg-slate-200" />
              or continue with email
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="email" className="text-sm font-medium text-ink">
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "email-error" : "email-hint"}
                className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-4 text-sm text-ink placeholder:text-ink-subtle transition-colors focus:outline-none focus:ring-4 ${
                  error
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
                }`}
              />
              {error ? (
                <p id="email-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-rose-600">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {error}
                </p>
              ) : (
                <div id="email-hint" className="mt-3 rounded-xl bg-surface p-3 text-xs text-ink-muted">
                  <p className="font-medium text-ink">Demo accounts — click to fill in:</p>
                  <ul className="mt-1.5 space-y-1">
                    {demoAccounts.map((account) => (
                      <li key={account.email} className="flex items-center justify-between gap-2">
                        <span>{account.label}</span>
                        <button
                          type="button"
                          className="font-medium text-brand-600 underline-offset-2 hover:underline"
                          onClick={() => setEmail(account.email)}
                        >
                          {account.email}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner label="Signing in" className="[&_svg]:text-white" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-ink-subtle">
            By continuing, you agree to the{" "}
            <Link href="/login#terms" className="font-medium text-brand-600 hover:underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/login#privacy" className="font-medium text-brand-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
