import type { ReactNode } from "react";

export function KeyValueList({ rows }: { rows: { label: string; value: ReactNode; mono?: boolean }[] }) {
  return (
    <dl className="kv">
      {rows.map((row) => (
        <div className="kv__row" key={row.label}>
          <dt>{row.label}</dt>
          <dd className={row.mono ? "mono" : undefined}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
