"use client";

// ChatWindow — the AI Support conversation card: header with "New chat",
// scrollable message list, resolution actions / ticket panel, and the input.
// Conversation logic lives in hooks/useSupportChat.ts.
import { Plus } from "lucide-react";
import { useEffect, useRef } from "react";

import { BotAvatar } from "@/components/illustrations/BotAvatar";
import { Button } from "@/components/ui/Button";
import { useSupportChat } from "@/hooks/useSupportChat";

import { ChatInput, type ChatInputHandle } from "./ChatInput";
import { ChatMessage, TypingIndicator } from "./ChatMessage";
import { CreateTicketConfirmation } from "./CreateTicketConfirmation";
import { ResolutionActions } from "./ResolutionActions";

interface ChatWindowProps {
  userName: string;
  /** A question to send automatically (from a topic card or the header search). */
  initialQuestion?: string;
  onInitialQuestionHandled?: () => void;
}

export function ChatWindow({ userName, initialQuestion, onInitialQuestionHandled }: ChatWindowProps) {
  const chat = useSupportChat();
  const { messages, phase, isTyping, draft, isCreatingTicket, sendMessage } = chat;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const handledQuestion = useRef<string | null>(null);

  // Auto-send the initial question exactly once per distinct value. The ref
  // also protects against React Strict Mode running effects twice in dev.
  useEffect(() => {
    if (!initialQuestion) {
      handledQuestion.current = null;
      return;
    }
    if (handledQuestion.current === initialQuestion) return;
    handledQuestion.current = initialQuestion;
    sendMessage(initialQuestion);
    onInitialQuestionHandled?.();
  }, [initialQuestion, onInitialQuestionHandled, sendMessage]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, phase, draft]);

  const lastIndex = messages.length - 1;
  const busy = isTyping || isCreatingTicket;

  function handleNewChat() {
    chat.newChat();
    inputRef.current?.focus();
  }

  return (
    <section
      aria-label="Conversation with the AI assistant"
      className="card flex h-[calc(100dvh-14rem)] min-h-[460px] flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <BotAvatar className="h-10 w-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">AI IT Assistant</p>
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Online · replies instantly
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleNewChat}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New chat
        </Button>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="flex-1 space-y-5 overflow-y-auto bg-gradient-to-b from-surface/60 to-white px-3 py-5 sm:px-5"
      >
        {messages.map((message, index) => {
          const isLast = index === lastIndex;
          return (
            <ChatMessage
              key={message.id}
              message={message}
              userName={userName}
              disabled={busy}
              onSuggestionClick={sendMessage}
              onNewChat={handleNewChat}
            >
              {isLast && !isTyping && phase === "awaiting-resolution" && (
                <ResolutionActions onResolved={chat.markResolved} onNotResolved={chat.markNotResolved} disabled={busy} />
              )}
              {isLast && phase === "confirming-ticket" && draft && (
                <CreateTicketConfirmation
                  draft={draft}
                  onConfirm={chat.confirmTicket}
                  onCancel={chat.cancelTicket}
                  submitting={isCreatingTicket}
                />
              )}
            </ChatMessage>
          );
        })}
        {isTyping && <TypingIndicator />}
      </div>

      <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
        <ChatInput
          ref={inputRef}
          onSend={sendMessage}
          disabled={busy}
          placeholder={phase === "confirming-ticket" ? "Or describe a different issue…" : "Describe your IT issue…"}
        />
        <p className="mt-2 px-1 text-[11px] text-ink-subtle">
          Press Enter to send · Shift + Enter for a new line. This prototype uses simulated AI responses.
        </p>
      </div>
    </section>
  );
}
