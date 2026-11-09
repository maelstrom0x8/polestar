import type { ComponentType } from "react";

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
        <a href={action.to} className="btn btn-secondary">
          {action.label}
        </a>
      ) : action ? (
        <button type="button" className="btn btn-secondary" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
