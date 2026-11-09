import type { ReactNode } from "react";

interface KeyFigureProps {
  label: string;
  value: ReactNode;
  unit?: string;
  items?: { label: string; value: ReactNode }[];
}

export function KeyFigure({ label, value, unit, items }: KeyFigureProps) {
  return (
    <section className="key-figure" aria-label={label}>
      <div className="key-figure__label">{label}</div>
      <div className="key-figure__value">
        <span>{value}</span>
        {unit && <span className="key-figure__unit">{unit}</span>}
      </div>
      {items && items.length > 0 && (
        <dl className="key-figure__items">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="key-figure__item-label">{item.label}</dt>
              <dd className="key-figure__item-value" style={{ margin: 0 }}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
