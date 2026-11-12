import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";

const TOKEN = /("[^"]*")|\b(import|from|const|await|new)\b|(\/\/.*)$/g;

function highlight(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(line.slice(last, index));
    const kind = match[1] ? "string" : match[2] ? "keyword" : "comment";
    parts.push(
      <span key={index} className={`code__${kind}`}>
        {match[0]}
      </span>,
    );
    last = index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="code__copy"
      aria-label={copied ? "Copied" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
    </button>
  );
}

export function CodeCard({ title, code }: { title: string; code: string }) {
  return (
    <figure className="code">
      <figcaption className="code__bar">
        <span className="code__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="code__title">{title}</span>
        <CopyButton text={code} label="Copy code" />
      </figcaption>
      <pre className="code__body">
        <code>
          {code.split("\n").map((line, index) => (
            <span className="code__line" key={index}>
              {highlight(line)}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
