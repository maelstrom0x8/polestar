import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "attention" | "error" | "neutral";

interface CalloutProps {
  tone: Tone;
  title?: ReactNode;
  children?: ReactNode;
  technical?: string;
  action?: ReactNode;
  role?: "alert" | "status";
}

const ICON = { info: Info, attention: AlertTriangle, error: OctagonAlert, neutral: Info };

export function Callout({ tone, title, children, technical, action, role }: CalloutProps) {
  const Icon = ICON[tone];
  return (
    <div className={`callout callout--${tone}`} role={role}>
      <Icon aria-hidden />
      <div className="callout__body">
        {title && <div className="callout__title">{title}</div>}
        {children && <div className="callout__text">{children}</div>}
        {technical && (
          <details className="technical">
            <summary>Technical detail</summary>
            <code>{technical}</code>
          </details>
        )}
        {action && <div className="callout__action">{action}</div>}
      </div>
    </div>
  );
}
