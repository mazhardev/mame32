import { memo } from 'react';
import type { Card } from './deck';
import { RANK_LABEL, SUIT_SYMBOL, cardColor, cardName } from './deck';

export interface PlayingCardProps {
  card: Card;
  width?: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

/**
 * One SVG-free playing card drawn with CSS only, so it scales cleanly and
 * ships no image assets. Face-down cards use an original striped back.
 */
function PlayingCardBase({
  card,
  width = 62,
  selected,
  dimmed,
  onClick,
  style,
  ariaLabel,
}: PlayingCardProps) {
  const height = Math.round(width * 1.45);
  const color = cardColor(card.suit) === 'red' ? '#d63b47' : '#1f2433';

  const base: React.CSSProperties = {
    width,
    height,
    borderRadius: Math.max(4, width * 0.1),
    position: 'relative',
    userSelect: 'none',
    transition: 'transform 140ms ease, box-shadow 140ms ease',
    transform: selected ? 'translateY(-10px)' : undefined,
    boxShadow: selected ? '0 8px 20px rgba(0,0,0,0.35)' : '0 1px 3px rgba(0,0,0,0.28)',
    opacity: dimmed ? 0.55 : 1,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  if (!card.faceUp) {
    return (
      <div
        style={{
          ...base,
          background:
            'repeating-linear-gradient(45deg, #4f46e5 0 6px, #4338ca 6px 12px)',
          border: '2px solid #e6e8f5',
        }}
        onClick={onClick}
        role={onClick ? 'button' : 'img'}
        tabIndex={onClick ? 0 : undefined}
        aria-label={ariaLabel ?? 'Face-down card'}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
      />
    );
  }

  const symbol = SUIT_SYMBOL[card.suit];
  const rank = RANK_LABEL[card.rank];

  return (
    <div
      style={{
        ...base,
        background: '#fdfdff',
        border: `1px solid ${selected ? '#4f46e5' : '#d7dae8'}`,
        color,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: Math.max(3, width * 0.07),
        fontWeight: 700,
        lineHeight: 1,
      }}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel ?? cardName(card)}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span style={{ fontSize: width * 0.28 }}>
        {rank}
        <span style={{ display: 'block', fontSize: width * 0.24 }}>{symbol}</span>
      </span>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: width * 0.46,
          opacity: 0.9,
        }}
        aria-hidden="true"
      >
        {symbol}
      </span>
      <span style={{ fontSize: width * 0.28, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
        {rank}
        <span style={{ display: 'block', fontSize: width * 0.24 }}>{symbol}</span>
      </span>
    </div>
  );
}

export const PlayingCard = memo(PlayingCardBase);

export function CardPlaceholder({ width = 62, label }: { width?: number; label?: string }) {
  return (
    <div
      style={{
        width,
        height: Math.round(width * 1.45),
        borderRadius: Math.max(4, width * 0.1),
        border: '1.5px dashed var(--border-strong)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-faint)',
        fontSize: width * 0.28,
      }}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}
