import type { ReactNode } from 'react';

export interface HudItem {
  label: string;
  value: ReactNode;
}

export function GameHud({ items, extra }: { items: HudItem[]; extra?: ReactNode }) {
  return (
    <div className="hud">
      {items.map((item) => (
        <div className="hud-item" key={item.label}>
          <span className="label">{item.label}</span>
          <span className="value">{item.value}</span>
        </div>
      ))}
      {extra && (
        <>
          <span className="spacer" />
          {extra}
        </>
      )}
    </div>
  );
}
