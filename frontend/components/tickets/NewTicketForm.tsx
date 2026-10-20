"use client";

// NewTicketForm — lets an employee raise a ticket directly, without going
// through the AI chat first. The ticket is created on the BACKEND through
// SupportContext.addTicket (POST /tickets), which stamps the signed-in employee
// as the requester and returns the server-generated id (e.g. TICKET-1).
import { AlertCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useSupport } from "@/context/SupportContext";
import type { Ticket, TicketCategory, TicketPriority } from "@/types";

const categories: TicketCategory[] = ["Network", "Account", "Software", "Email", "Hardware", "Other"];
const priorities: TicketPriority[] = ["Low", "Medium", "High"];

const fieldClasses =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-ink placeholder:text-ink-subtle transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

export function NewTicketForm({ onCreated, onCancel }: { onCreated: (ticket: Ticket) => void; onCancel: () => void }) {
  const { addTicket } = useSupport();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("Other");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError("Please add a subject and describe the issue.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // addTicket calls the backend (POST /tickets). The server generates the
      // real id and sets status=Open, so we only send the employee-entered
      // fields. We still pass status:"Open" to satisfy the TicketDraft type;
      // the backend ignores/overrides it.
      const ticket = await addTicket({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
      });
      onCreated(ticket);
    } catch {
      setError("Could not create the ticket. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card space-y-4 p-5 sm:p-6" aria-labelledby="new-ticket-heading">
      <div>
        <h2 id="new-ticket-heading" className="text-base font-semibold text-ink">
          Create a new ticket
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">Tell the IT team what&apos;s wrong and they&apos;ll follow up.</p>
      </div>

      <div>
        <label htmlFor="ticket-subject" className="text-sm font-medium text-ink">
          Subject
        </label>
        <input
          id="ticket-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={100}
          placeholder="e.g. Monitor flickers when docked"
          className={`${fieldClasses} h-11`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ticket-category" className="text-sm font-medium text-ink">
            Category
          </label>
          <select
            id="ticket-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
            className={`${fieldClasses} h-11`}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ticket-priority" className="text-sm font-medium text-ink">
            Priority
          </label>
          <select
            id="ticket-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            className={`${fieldClasses} h-11`}
          >
            {priorities.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="ticket-description" className="text-sm font-medium text-ink">
          Description
        </label>
        <textarea
          id="ticket-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What happened, when it started, and anything you've already tried."
          className={`${fieldClasses} py-2.5`}
        />
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner label="Submitting ticket" className="[&_svg]:text-white" />
              Submitting...
            </>
          ) : (
            "Submit ticket"
          )}
        </Button>
      </div>
    </form>
  );
}
