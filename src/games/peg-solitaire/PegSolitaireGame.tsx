import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { CENTRE, N, allJumps, apply, jumpsFrom, layout, pegCount, solve } from './engine';
import type { Hole, Jump, LayoutName } from './engine';

const LAYOUT: Record<'easy' | 'normal' | 'hard', LayoutName> = { easy: 'plus', normal: 'pyramid', hard: 'classic' };
const LAYOUT_LABEL: Record<LayoutName, string> = { plus: 'Plus (9 pegs)', pyramid: 'Pyramid (16 pegs)', classic: 'Classic (32 pegs)' };

export default function PegSolitaireGame() {
  const shell = useGameShell();
  const name = LAYOUT[shell.difficulty];
  const [history, setHistory] = useState<Hole[][]>(() => [layout(name)]);
  const [sel, setSel] = useState<number | null>(null);
  const [hint, setHint] = useState<Jump | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [undos, setUndos] = useState(0);
  const board = history[history.length - 1];

  const restart = useCallback(() => {
    setHistory([layout(name)]);
    setSel(null);
    setHint(null);
    setNote(null);
    setOver(false);
    setUndos(0);
  }, [name]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const targets = useMemo(() => (sel === null ? [] : jumpsFrom(board, sel)), [board, sel]);
  const pegs = pegCount(board);

  const finish = useCallback(
    (b: Hole[], undoCount: number) => {
      setOver(true);
      const left = pegCount(b);
      const centre = left === 1 && b[CENTRE] === 1;
      const won = left === 1;
      const title = centre ? 'Perfect — one peg, right in the centre!' : won ? 'Solved — one peg left!' : `No more jumps — ${left} pegs left`;
      setNote(title);
      shell.play(won ? 'levelComplete' : 'gameOver');
      if (won) {
        void reportProgress('peg-solitaire.solve', 1);
        if (name === 'classic') void reportProgress('peg-solitaire.classic', 1);
        if (centre && name === 'classic') void reportProgress('peg-solitaire.centre', 1);
        if (undoCount === 0) void reportProgress('peg-solitaire.clean', 1);
      }
      const start = pegCount(layout(name));
      shell.endRound({
        score: (start - left) * 10 + (won ? 200 : 0) + (centre ? 300 : 0),
        won,
        lost: !won,
        title,
        details: [
          { label: 'Board', value: LAYOUT_LABEL[name] },
          { label: 'Pegs left', value: String(left) },
          { label: 'Undos', value: String(undoCount) },
        ],
      });
    },
    [name, shell],
  );

  const doJump = (j: Jump) => {
    if (history.length === 1) shell.startRound();
    const next = apply(board, j);
    setHistory([...history, next]);
    setSel(allJumps(next).some((k) => k.from === j.to) ? j.to : null);
    setHint(null);
    setNote(null);
    shell.play('click');
    if (!allJumps(next).length) finish(next, undos);
  };

  const onHole = (i: number) => {
    if (over || shell.paused || board[i] === -1) return;
    const t = targets.find((j) => j.to === i);
    if (t) return doJump(t);
    if (board[i] === 1) {
      setSel(sel === i ? null : i);
      if (!jumpsFrom(board, i).length) setNote('That peg has no jump available.');
      else setNote(null);
    }
  };

  const undo = () => {
    if (history.length < 2 || over) return;
    setHistory(history.slice(0, -1));
    setSel(null);
    setHint(null);
    setUndos(undos + 1);
  };

  const showHint = () => {
    if (over) return;
    const path = pegs <= 20 ? solve(board, false, 150_000) : null;
    if (path && path.length) {
      setHint(path[0]);
      setSel(path[0].from);
      setNote('Hint: this jump still leads to a one-peg finish.');
    } else if (pegs > 20) {
      const any = allJumps(board)[0];
      setHint(any ?? null);
      setNote('Too many pegs to look all the way ahead — here is a legal jump.');
    } else {
      setNote('No one-peg finish is possible from here. Try undoing a few moves.');
    }
  };

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Pegs', value: pegs },
          { label: 'Moves', value: history.length - 1 },
        ]}
      />
      <StatusBar>{note ?? `${LAYOUT_LABEL[name]} — jump pegs until only one remains`}</StatusBar>
      <div className="sq-board" style={{ ['--cells' as string]: N, background: '#b77b47', padding: 6, gap: 0 }} role="grid" aria-label="Peg solitaire board">
        {board.map((h, i) => {
          if (h === -1) return <div key={i} className="sq" style={{ background: 'var(--bg)' }} aria-hidden="true" />;
          const isTarget = targets.some((j) => j.to === i);
          const isHint = hint && (hint.from === i || hint.to === i);
          return (
            <button
              key={i}
              type="button"
              className={`sq ${sel === i ? 'sel' : ''}`}
              style={{ background: isHint ? '#d9a066' : '#b77b47' }}
              onClick={() => onHole(i)}
              aria-label={`Row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}, ${h ? 'peg' : isTarget ? 'empty, jump here' : 'empty'}`}
            >
              {h === 1 ? (
                <span className="piece" style={{ width: '62%', height: '62%', background: 'radial-gradient(circle at 35% 30%, #93c5fd, #1d4ed8)' }} />
              ) : (
                <span className="hint" style={{ width: '30%', height: '30%', background: isTarget ? '#ffd84d' : 'rgba(60,30,10,0.55)' }} />
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn" onClick={undo} disabled={history.length < 2 || over}>
          ↶ Undo
        </button>
        <button type="button" className="btn" onClick={showHint} disabled={over}>
          💡 Hint
        </button>
      </div>
    </BoardLayout>
  );
}
