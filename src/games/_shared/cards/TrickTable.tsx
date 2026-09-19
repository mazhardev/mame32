import type { ReactNode } from 'react';
import { PlayingCard } from './PlayingCard';
import type { Card } from './deck';
import type { Play } from './tricks';
import './tricktable.css';

const SEAT_CLASS = ['s', 'w', 'n', 'e'];

/** Four-seat table: opponents' card counts around the edge, the current trick in the middle. */
export function TrickTable({
  names,
  counts,
  trick,
  width,
  turn,
  info,
}: {
  names: string[];
  counts: number[];
  trick: Play[];
  width: number;
  turn: number | null;
  info?: (seat: number) => ReactNode;
}) {
  return (
    <div className="trick-table">
      {[1, 2, 3].map((seat) => (
        <div key={seat} className={`trick-seat ${SEAT_CLASS[seat]} ${turn === seat ? 'turn' : ''}`}>
          <div className="trick-name">{names[seat]}</div>
          <div className="trick-backs" aria-label={`${counts[seat]} cards`}>
            {Array.from({ length: Math.min(counts[seat], 13) }, (_, k) => (
              <span key={k} />
            ))}
          </div>
          {info && <div className="trick-info">{info(seat)}</div>}
        </div>
      ))}
      <div className="trick-center" aria-label="Current trick">
        {trick.map((p) => (
          <div key={p.card.id} className={`trick-card ${SEAT_CLASS[p.seat]}`}>
            <PlayingCard card={{ ...p.card, faceUp: true }} width={width} ariaLabel={`${names[p.seat]} played ${p.card.rank} of ${p.card.suit}`} />
          </div>
        ))}
      </div>
      <div className={`trick-seat s ${turn === 0 ? 'turn' : ''}`}>
        <div className="trick-name">{names[0]}</div>
        {info && <div className="trick-info">{info(0)}</div>}
      </div>
    </div>
  );
}

export type { Card };
