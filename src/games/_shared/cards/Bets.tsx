/** Chip buttons for choosing a stake in the virtual-points table games. */
export function BetControls({
  bank,
  bet,
  onBet,
  steps = [10, 25, 50, 100],
  disabled,
}: {
  bank: number;
  bet: number;
  onBet: (bet: number) => void;
  steps?: number[];
  disabled?: boolean;
}) {
  return (
    <div className="bet-row" role="group" aria-label="Stake">
      {steps.map((s) => (
        <button key={s} type="button" className={`btn ${bet === s ? 'btn-primary' : ''}`} disabled={disabled || s > bank} onClick={() => onBet(s)} aria-pressed={bet === s}>
          {s}
        </button>
      ))}
    </div>
  );
}

/** Reminder shown on every casino-style game. */
export function VirtualPointsNote() {
  return (
    <p className="muted small" style={{ textAlign: 'center', margin: 0 }}>
      Simulation with virtual points only — no real money, no purchases, nothing to win.
    </p>
  );
}
