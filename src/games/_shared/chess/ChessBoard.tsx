import { useEffect, useMemo, useState } from 'react';
import { B, N, Q, R, moveFrom, movePromo, moveTo, squareName } from './engine';
import type { Chess } from './engine';
import '../board/board.css';
import './chess.css';

// Solid glyphs for both sides (coloured by CSS); U+FE0E asks for text, not emoji, rendering.
const GLYPH = ['', '♟︎', '♞︎', '♝︎', '♜︎', '♛︎', '♚︎'];
const NAMES = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

export function PieceGlyph({ piece }: { piece: number }) {
  return <span className={`chess-piece ${piece > 0 ? 'w' : 'b'}`}>{GLYPH[Math.abs(piece)]}</span>;
}

interface Props {
  chess: Chess;
  /** Which colour sits at the bottom. */
  orientation?: 1 | -1;
  /** Only this side's pieces can be moved (null = nobody, 'turn' = side to move). */
  movable: 1 | -1 | 'turn' | null;
  onMove: (move: number) => void;
  lastMove?: number | null;
  /** Extra highlighted squares, e.g. a hint. */
  marks?: number[];
  /** Changes whenever the position changes, so memoised move lists refresh. */
  version: unknown;
}

export function ChessBoard({ chess, orientation = 1, movable, onMove, lastMove, marks = [], version }: Props) {
  const [sel, setSel] = useState<number | null>(null);
  const [promo, setPromo] = useState<number[] | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const legal = useMemo(() => chess.moves(), [chess, version]);
  // A new position clears any half-made selection.
  useEffect(() => {
    setSel(null);
    setPromo(null);
  }, [version]);
  const side = movable === 'turn' ? chess.turn : movable;
  const canMove = side !== null && side === chess.turn;
  const targets = sel === null ? [] : legal.filter((m) => moveFrom(m) === sel);
  const checkSq = chess.inCheck() ? chess.kings[chess.turn] : -1;

  const click = (sq: number) => {
    if (!canMove) return;
    const choices = targets.filter((m) => moveTo(m) === sq);
    if (choices.length > 1) {
      setPromo(choices);
      return;
    }
    if (choices.length === 1) {
      setSel(null);
      onMove(choices[0]);
      return;
    }
    const p = chess.board[sq];
    setSel(p && Math.sign(p) === chess.turn && sel !== sq ? sq : null);
  };

  const squares = Array.from({ length: 64 }, (_, k) => (orientation === 1 ? k : 63 - k));

  return (
    <div className="chess-wrap">
      <div className="sq-board chess-board" style={{ ['--cells' as string]: 8 }} role="grid" aria-label="Chess board">
        {squares.map((sq) => {
          const p = chess.board[sq];
          const light = ((sq >> 3) + (sq & 7)) % 2 === 0;
          const isTarget = targets.some((m) => moveTo(m) === sq);
          const isLast = lastMove != null && (moveFrom(lastMove) === sq || moveTo(lastMove) === sq);
          const cls = ['sq', light ? 'light' : 'dark', sel === sq ? 'sel' : '', isLast ? 'chess-last' : '', sq === checkSq ? 'chess-check' : '', marks.includes(sq) ? 'chess-mark' : ''].join(' ');
          const r = sq >> 3;
          const f = sq & 7;
          const showFile = orientation === 1 ? r === 7 : r === 0;
          const showRank = orientation === 1 ? f === 0 : f === 7;
          return (
            <button
              key={sq}
              type="button"
              className={cls}
              onClick={() => click(sq)}
              aria-label={`${squareName(sq)}${p ? `, ${p > 0 ? 'white' : 'black'} ${NAMES[Math.abs(p)]}` : ''}${isTarget ? ', legal move' : ''}`}
            >
              {showFile && <span className="chess-coord file">{'abcdefgh'[f]}</span>}
              {showRank && <span className="chess-coord rank">{8 - r}</span>}
              {p !== 0 && <PieceGlyph piece={p} />}
              {isTarget && <span className={p ? 'chess-capture' : 'hint'} />}
            </button>
          );
        })}
      </div>
      {promo && (
        <div className="chess-promo" role="dialog" aria-label="Choose promotion piece">
          {[Q, R, B, N].map((t) => {
            const m = promo.find((x) => movePromo(x) === t);
            return (
              <button
                key={t}
                type="button"
                aria-label={`Promote to ${NAMES[t]}`}
                onClick={() => {
                  setPromo(null);
                  setSel(null);
                  if (m !== undefined) onMove(m);
                }}
              >
                <PieceGlyph piece={t * chess.turn} />
              </button>
            );
          })}
          <button type="button" className="chess-promo-cancel" onClick={() => setPromo(null)} aria-label="Cancel">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
