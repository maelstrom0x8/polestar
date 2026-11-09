import type { ComponentType } from "react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  Icon: ComponentType<{ "aria-hidden"?: boolean }>;
  message: string;
  action?: { label: string; onClick: () => void } | { label: string; to: string };
}

export function EmptyState({ Icon, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon aria-hidden />
      <p className="empty-state__message">{message}</p>
      {action && "to" in action ? (
        <Link to={action.to} className="app-btn app-btn--secondary">
          {action.label}
        </Link>
      ) : action ? (
        <button type="button" className="app-btn app-btn--secondary" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
