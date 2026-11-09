import type { ReactNode } from "react";

interface ContainerProps {
  title?: ReactNode;
  headerAction?: ReactNode;
  toolbar?: ReactNode;
  note?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

export function Container({ title, headerAction, toolbar, note, padded, className, children }: ContainerProps) {
  return (
    <section className={`container${className ? ` ${className}` : ""}`}>
      {title && (
        <div className="container__header">
          <h2 className="container__title">{title}</h2>
          {headerAction}
        </div>
      )}
      {toolbar && <div className="container__toolbar">{toolbar}</div>}
      {padded ? <div className="container__body">{children}</div> : children}
      {note && <div className="container__note">{note}</div>}
    </section>
  );
}
