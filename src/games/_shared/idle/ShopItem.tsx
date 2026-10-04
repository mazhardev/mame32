import type { ReactNode } from 'react';

/** One row of an idle-game shop: icon, name, detail, count, and a price. */
export function ShopItem({
  icon,
  name,
  detail,
  count,
  cost,
  affordable,
  onBuy,
  label,
}: {
  icon: ReactNode;
  name: string;
  detail: ReactNode;
  count?: ReactNode;
  cost?: ReactNode;
  affordable: boolean;
  onBuy?: () => void;
  label?: string;
}) {
  const body = (
    <>
      <span className="idle-icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <strong>{name}</strong>
        <small>{detail}</small>
        {cost !== undefined && <span className="idle-cost">{cost}</span>}
      </span>
      {count !== undefined && <span className="idle-count">{count}</span>}
    </>
  );
  if (!onBuy) return <div className="idle-item">{body}</div>;
  return (
    <button
      type="button"
      className="idle-item"
      disabled={!affordable}
      onClick={onBuy}
      aria-label={label ?? `Buy ${name}`}
    >
      {body}
    </button>
  );
}

/** Buy 1 / 10 / Max switch shared by idle shops. */
export function BulkSwitch({
  value,
  onChange,
}: {
  value: 1 | 10 | 'max';
  onChange: (v: 1 | 10 | 'max') => void;
}) {
  return (
    <div className="idle-tabs" role="group" aria-label="Buy amount">
      {([1, 10, 'max'] as const).map((v) => (
        <button
          key={v}
          type="button"
          className={`btn btn-sm ${value === v ? 'btn-primary' : ''}`}
          onClick={() => onChange(v)}
        >
          {v === 'max' ? 'Max' : `×${v}`}
        </button>
      ))}
    </div>
  );
}
