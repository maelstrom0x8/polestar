import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useId } from "react";

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  counter?: string;
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode;
}

export function FieldShell({ label, hint, error, counter, children }: FieldShellProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="form-field">
      <div className="form-field__top">
        <label htmlFor={inputId} className="form-field__label">
          {label}
        </label>
        {counter && <span className="form-field__counter">{counter}</span>}
      </div>
      {children({ inputId, describedBy })}
      {hint && !error && (
        <p id={hintId} className="form-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="form-field__error">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  counter?: string;
  suffix?: string;
};

export function TextField({ label, hint, error, counter, suffix, className, ...input }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} counter={counter}>
      {({ inputId, describedBy }) => (
        <div className={`form-input${suffix ? " form-input--suffixed" : ""}${error ? " form-input--invalid" : ""}`}>
          <input
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={className}
            {...input}
          />
          {suffix && <span className="form-input__suffix">{suffix}</span>}
        </div>
      )}
    </FieldShell>
  );
}

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  counter?: string;
};

export function TextAreaField({ label, hint, error, counter, ...area }: TextAreaProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} counter={counter}>
      {({ inputId, describedBy }) => (
        <div className={`form-input${error ? " form-input--invalid" : ""}`}>
          <textarea id={inputId} aria-describedby={describedBy} aria-invalid={error ? true : undefined} {...area} />
        </div>
      )}
    </FieldShell>
  );
}
