// ChatMessage — one bubble in the conversation, plus the typing indicator.
// Assistant bubbles sit on the left with the bot avatar; employee bubbles sit
// on the right in primary blue.
import { ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BotAvatar } from "@/components/illustrations/BotAvatar";
import { Avatar } from "@/components/ui/Avatar";
import { MarkdownContent } from "./MarkdownContent";
import { cn, formatTime } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
  userName: string;
  onSuggestionClick?: (question: string) => void;
  onNewChat?: () => void;
  /** Disables interactive chips/buttons while the assistant is responding. */
  disabled?: boolean;
  /** Extra UI attached under the bubble (resolution buttons, ticket panel). */
  children?: ReactNode;
}

export function ChatMessage({ message, userName, onSuggestionClick, onNewChat, disabled, children }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex animate-fade-in-up gap-3", isUser && "flex-row-reverse")}>
      {isUser ? <Avatar name={userName} className="h-9 w-9 text-xs" /> : <BotAvatar />}

      <div className={cn("flex min-w-0 max-w-[88%] flex-col gap-2 sm:max-w-[75%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-md bg-brand-600 text-white shadow-sm shadow-brand-600/20"
              : message.tone === "success"
                ? "rounded-tl-md border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "rounded-tl-md border border-slate-200/80 bg-white text-ink shadow-sm",
          )}
        >
          <div className="flex items-start gap-2 break-words">
            {message.tone === "success" && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            )}
            {/* User text is shown as-is (plain). Assistant text is Markdown
                from the AI, so we render it with MarkdownContent for proper
                headings, bold, lists, and links. */}
            {isUser ? (
              <span className="whitespace-pre-line">{message.content}</span>
            ) : (
              <div className="min-w-0 flex-1">
                <MarkdownContent content={message.content} />
              </div>
            )}
          </div>

          {message.steps && message.steps.length > 0 && (
            <ol className="mt-3 space-y-2.5">
              {message.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          )}

          {(message.link || message.offerNewChat) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.link && (
                <Link
                  href={message.link.href}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-50"
                >
                  {message.link.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
              {message.offerNewChat && onNewChat && (
                <button
                  type="button"
                  onClick={onNewChat}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Start a new chat
                </button>
              )}
            </div>
          )}
        </div>

        {message.suggestions && message.suggestions.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
            {message.suggestions.map((question) => (
              <li key={question}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSuggestionClick?.(question)}
                  className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {question}
                </button>
              </li>
            ))}
          </ul>
        )}

        {children}

        <time dateTime={message.createdAt} className="px-1 text-[11px] text-ink-subtle">
          {isUser ? "You" : "AI Assistant"} · {formatTime(message.createdAt)}
        </time>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex animate-fade-in-up gap-3" role="status">
      <BotAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
        <span className="sr-only">AI assistant is typing</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="h-2 w-2 animate-typing-dot rounded-full bg-brand-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
