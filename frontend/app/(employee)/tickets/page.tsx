"use client";

// /tickets — the employee's own tickets, plus a form to raise a new one.
// Only tickets whose requester is the signed-in employee are listed.
import { Bot, CheckCircle2, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { NewTicketForm } from "@/components/tickets/NewTicketForm";
import { TicketList } from "@/components/tickets/TicketList";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeading } from "@/components/ui/PageHeading";
import { useSupport } from "@/context/SupportContext";

export default function MyTicketsPage() {
  const { myTickets } = useSupport();
  const [formOpen, setFormOpen] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading
        title="My Tickets"
        subtitle="Track and manage the issues you've raised with IT."
        actions={
          !formOpen && (
            <Button
              onClick={() => {
                setFormOpen(true);
                setCreatedId(null);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New ticket
            </Button>
          )
        }
      />

      {createdId && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Ticket {createdId} has been created. The IT team will follow up soon.
        </p>
      )}

      {formOpen && (
        <NewTicketForm
          onCancel={() => setFormOpen(false)}
          onCreated={(ticket) => {
            setFormOpen(false);
            setCreatedId(ticket.id);
          }}
        />
      )}

      <TicketList
        tickets={myTickets}
        empty={
          <EmptyState
            className="py-16"
            title="No tickets yet"
            description="Raise a ticket directly, or try the AI assistant first — it can often fix the issue right away."
            action={
              <Link href="/ai-support" className={buttonClasses("secondary", "sm")}>
                <Bot className="h-4 w-4" aria-hidden="true" />
                Chat with AI
              </Link>
            }
          />
        }
      />
    </div>
  );
}
