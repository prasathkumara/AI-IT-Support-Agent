"use client";

// ChatInput — auto-growing message box. Enter sends; Shift+Enter adds a new line.
import { SendHorizontal } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface ChatInputHandle {
  focus: () => void;
}

const MAX_HEIGHT = 160;

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  { onSend, disabled = false, placeholder = "Describe your IT issue…" },
  ref,
) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }), []);

  // Grow with the content up to MAX_HEIGHT, then scroll.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !disabled;

  function submit() {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-colors focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100"
    >
      <label htmlFor="chat-input" className="sr-only">
        Message the AI assistant
      </label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
          canSend ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-slate-100 text-ink-subtle",
        )}
      >
        <SendHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
    </form>
  );
});
