import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Card } from './deck';
import { PlayingCard } from './PlayingCard';
import './table.css';

/**
 * Width available for cards on the felt: the game stage, less the board
 * layout's padding (24px) and the felt's own padding (up to 32px). Measuring
 * the stage, not the window, keeps a full hand on screen on a phone, where the
 * page around the game takes its own margins.
 */
export function feltWidth(): number {
  if (typeof window === 'undefined') return 1024;
  const stage = document.querySelector<HTMLElement>('.game-stage');
  const outer = stage?.clientWidth || window.innerWidth - 34;
  return Math.min(outer, 1100) - 56;
}

/** Re-renders when the game stage changes width (rotation, full screen). */
function useFeltWidth(): number {
  const [w, setW] = useState(feltWidth);
  useEffect(() => {
    const on = () => setW(feltWidth());
    on();
    const stage = document.querySelector<HTMLElement>('.game-stage');
    const ro = stage && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(on) : null;
    if (stage) ro?.observe(stage);
    window.addEventListener('resize', on);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', on);
    };
  }, []);
  return w;
}

/** Card width that lets `columns` cards (plus gaps) fit the felt. */
export function useCardWidth(columns: number, max = 72, min = 30): number {
  const avail = useFeltWidth();
  return Math.max(min, Math.min(max, Math.floor((avail - columns * 6) / columns)));
}

/** Green baize panel that card games sit on. */
export function Felt({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`felt ${className}`}>{children}</div>;
}

interface HandProps {
  cards: Card[];
  width: number;
  /** Horizontal step between cards; defaults to a readable overlap. */
  step?: number;
  selected?: (card: Card, index: number) => boolean;
  playable?: (card: Card, index: number) => boolean;
  onPick?: (card: Card, index: number) => void;
  label?: string;
}

/** A row of overlapping cards, e.g. a player's hand. */
export function Hand({ cards, width, step, selected, playable, onPick, label }: HandProps) {
  const avail = Math.min(useFeltWidth(), 860);
  const gap = step ?? Math.max(width * 0.42, Math.min(width + 6, (avail - width) / Math.max(1, cards.length - 1)));
  const total = cards.length ? width + gap * (cards.length - 1) : width;
  return (
    <div className="card-hand" style={{ width: total, height: Math.round(width * 1.45) + 12 }} aria-label={label}>
      {cards.map((c, i) => {
        const can = playable ? playable(c, i) : !!onPick;
        return (
          <div key={c.id} className="card-hand-slot" style={{ left: i * gap, zIndex: i }}>
            <PlayingCard
              card={c}
              width={width}
              selected={selected?.(c, i)}
              dimmed={!!playable && !can}
              onClick={onPick && can ? () => onPick(c, i) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

/** A vertical cascade, as in solitaire tableaus. Face-down cards overlap more tightly. */
export function Cascade({
  cards,
  width,
  maxHeight,
  isSelected,
  onPick,
  onEmpty,
  emptyLabel,
  highlight,
}: {
  cards: Card[];
  width: number;
  maxHeight?: number;
  isSelected?: (index: number) => boolean;
  onPick?: (index: number) => void;
  onEmpty?: () => void;
  emptyLabel?: string;
  highlight?: boolean;
}) {
  const h = Math.round(width * 1.45);
  let down = width * 0.18;
  let up = width * 0.36;
  const natural = cards.reduce((s, c, i) => (i === cards.length - 1 ? s : s + (c.faceUp ? up : down)), h);
  if (maxHeight && natural > maxHeight && cards.length > 1) {
    const k = (maxHeight - h) / (natural - h);
    down *= k;
    up *= k;
  }
  let y = 0;
  const tops = cards.map((c) => {
    const t = y;
    y += c.faceUp ? up : down;
    return t;
  });
  const height = cards.length ? tops[tops.length - 1] + h : h;
  return (
    <div className={`card-cascade ${highlight ? 'hl' : ''}`} style={{ width, height }}>
      {!cards.length && (
        <button type="button" className="card-empty" style={{ width, height: h }} onClick={onEmpty} aria-label={emptyLabel ?? 'Empty pile'} disabled={!onEmpty}>
          {emptyLabel && emptyLabel.length <= 2 ? emptyLabel : ''}
        </button>
      )}
      {cards.map((c, i) => (
        <div key={c.id} className="card-cascade-slot" style={{ top: tops[i], zIndex: i }}>
          <PlayingCard card={c} width={width} selected={isSelected?.(i)} onClick={onPick ? () => onPick(i) : undefined} />
        </div>
      ))}
    </div>
  );
}
