import { Check, Copy } from "lucide-react";
import { Fragment, useState } from "react";

function highlight(json: string) {
  return json.split("\n").map((line, i) => {
    const match = /^(\s*)("[^"]+")(:.*)$/.exec(line);
    return (
      <Fragment key={i}>
        {match ? (
          <>
            {match[1]}
            <span className="payload__key">{match[2]}</span>
            {match[3]}
          </>
        ) : (
          line
        )}
        {"\n"}
      </Fragment>
    );
  });
}

export function PayloadBlock({ value, label }: { value: unknown; label: string }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="payload">
      <button type="button" className="payload__copy" onClick={copy} aria-label={`Copy ${label}`}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre aria-label={label}>{highlight(text)}</pre>
    </div>
  );
}
