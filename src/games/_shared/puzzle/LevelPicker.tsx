import { highestUnlocked, levelKey } from './levels';

/**
 * Compact level navigation: previous / next buttons around a select listing
 * every level in the pack, with solved levels ticked and locked ones disabled.
 */
export function LevelPicker({
  pack,
  count,
  index,
  solved,
  onPick,
  formatBest,
  disabled,
}: {
  pack: string;
  count: number;
  index: number;
  solved: Record<string, number>;
  onPick: (index: number) => void;
  formatBest?: (best: number) => string;
  disabled?: boolean;
}) {
  const maxOpen = highestUnlocked(solved, pack, count);
  return (
    <div className="pz-levels">
      <button
        type="button"
        className="icon-btn"
        onClick={() => onPick(index - 1)}
        disabled={disabled || index === 0}
        aria-label="Previous level"
      >
        ◀
      </button>
      <select
        className="select"
        value={index}
        disabled={disabled}
        aria-label="Level"
        onChange={(e) => onPick(Number(e.target.value))}
      >
        {Array.from({ length: count }, (_, i) => {
          const best = solved[levelKey(pack, i)];
          const locked = i > maxOpen;
          const suffix = locked
            ? ' 🔒'
            : best !== undefined
              ? ` ✓${formatBest ? ` (${formatBest(best)})` : ''}`
              : '';
          return (
            <option key={i} value={i} disabled={locked}>
              Level {i + 1}
              {suffix}
            </option>
          );
        })}
      </select>
      <button
        type="button"
        className="icon-btn"
        onClick={() => onPick(index + 1)}
        disabled={disabled || index >= maxOpen}
        aria-label="Next level"
      >
        ▶
      </button>
    </div>
  );
}
