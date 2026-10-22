// MarkdownContent — renders an assistant message written in Markdown as nicely
// styled HTML (headings, bold, lists, links, code). This replaces dumping the
// raw text (which showed literal ** and # characters).
//
// SAFETY: react-markdown does NOT render raw HTML by default, so LLM output
// cannot inject <script> or other markup. We treat the AI text as untrusted and
// rely on that safe-by-default behaviour (no rehype-raw here on purpose).
//
// ANIMATION: list items fade/slide in with a small stagger, giving the
// "step 1 -> step 2 -> ..." reveal feel using the real list structure (no
// brittle "Step N:" text parsing).
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// We assign each list item an increasing CSS animation-delay via a counter so
// they appear one after another. The counter resets per render of this block.
function makeComponents(): Components {
  let itemIndex = 0;

  return {
    // Headings — used by the AI for section titles like "## VPN Setup".
    h1: ({ children }) => <h3 className="mt-3 mb-1.5 text-sm font-bold text-ink first:mt-0">{children}</h3>,
    h2: ({ children }) => <h3 className="mt-3 mb-1.5 text-sm font-bold text-ink first:mt-0">{children}</h3>,
    h3: ({ children }) => <h4 className="mt-3 mb-1 text-sm font-semibold text-ink first:mt-0">{children}</h4>,

    // Paragraphs — tight vertical rhythm inside a chat bubble.
    p: ({ children }) => <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>,

    // Bold / emphasis.
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,

    // Lists. Ordered lists get a visible number; unordered get a brand dot.
    ol: ({ children }) => <ol className="my-2 space-y-1.5 first:mt-0 last:mb-0">{children}</ol>,
    ul: ({ children }) => <ul className="my-2 space-y-1.5 first:mt-0 last:mb-0">{children}</ul>,
    li: ({ children }) => {
      const delay = itemIndex * 0.06; // seconds between each item appearing
      itemIndex += 1;
      return (
        <li
          className="flex animate-fade-in-up gap-2 leading-relaxed"
          style={{ animationDelay: `${delay}s` }}
        >
          <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          <span className="min-w-0">{children}</span>
        </li>
      );
    },

    // Links — open safely in a new tab, styled in brand color.
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800 break-words"
      >
        {children}
      </a>
    ),

    // Inline code and code blocks.
    code: ({ children }) => (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.8em] text-ink">{children}</code>
    ),
    pre: ({ children }) => (
      <pre className="my-2 overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">{children}</pre>
    ),

    // Blockquotes (occasionally used for notes/warnings).
    blockquote: ({ children }) => (
      <blockquote className="my-2 border-l-2 border-brand-200 pl-3 text-ink-muted">{children}</blockquote>
    ),
  };
}

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm text-ink">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={makeComponents()}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
