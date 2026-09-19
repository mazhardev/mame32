import './dice.css';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** A single die face; `rolling` plays a short tumble animation. */
export function Die({ value, rolling, color }: { value: number; rolling?: boolean; color?: string }) {
  return (
    <span className={`die ${rolling ? 'rolling' : ''}`} style={color ? { borderColor: color } : undefined} role="img" aria-label={`Die showing ${value}`}>
      {Array.from({ length: 9 }, (_, k) => (
        <i key={k} className={PIPS[value]?.includes(k) ? 'on' : ''} />
      ))}
    </span>
  );
}
