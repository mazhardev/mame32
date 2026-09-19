import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { loadProgress, saveProgress } from '@/storage/StorageService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { ChessBoard } from '../_shared/chess/ChessBoard';
import { Chess, moveFrom, moveTo } from '../_shared/chess/engine';
import { puzzleSet } from './sets';

const GAME_ID = 'chess-puzzle';
type Stage = 'key' | 'finish' | 'solved' | 'failed';

export default function ChessPuzzleGame() {
  const shell = useGameShell();
  const level = shell.difficulty;
  const set = useMemo(() => puzzleSet(level), [level]);
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState<Record<string, number[]>>({});
  const chess = useRef(new Chess()).current;
  const [version, setVersion] = useState(0);
  const [stage, setStage] = useState<Stage>('key');
  const [note, setNote] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [last, setLast] = useState<number | null>(null);
  const [hint, setHint] = useState<number[]>([]);
  const streak = useRef(0);
  const nextByLevel = useRef<Record<string, number>>({});
  const stageRef = useRef<Stage>('key');
  stageRef.current = stage;
  const loaded = useRef(false);
  const begun = useRef(false);

  const puzzle = set.items[index % set.items.length];

  const load = useCallback(
    (i: number) => {
      const p = set.items[i % set.items.length];
      chess.load(p.fen);
      setIndex(i % set.items.length);
      begun.current = false;
      setStage('key');
      setNote(null);
      setMistakes(0);
      setLast(null);
      setHint([]);
      setVersion((v) => v + 1);
    },
    [chess, set],
  );

  useEffect(() => {
    void loadProgress<{ solved: Record<string, number[]>; next: Record<string, number> }>(GAME_ID).then((s) => {
      loaded.current = true;
      const solvedMap = s?.solved && typeof s.solved === 'object' ? s.solved : {};
      setSolved(solvedMap);
      nextByLevel.current = s?.next && typeof s.next === 'object' ? { ...s.next } : {};
      load(Math.max(0, Number(s?.next?.[level]) || 0));
    });
  }, [level, load]);

  // After a solve, Play Again moves on to the next puzzle.
  const restart = useCallback(() => load(stageRef.current === 'solved' ? index + 1 : index), [index, load]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const persist = (nextSolved: Record<string, number[]>, nextIndex: number) => {
    const total = Object.values(nextSolved).reduce((n, l) => n + l.length, 0);
    void saveProgress(
      GAME_ID,
      { solved: nextSolved, next: (nextByLevel.current = { ...nextByLevel.current, [level]: nextIndex }) },
      { label: `${total} solved`, percent: Math.round((total / (set.items.length * 3)) * 100) },
    );
  };

  const succeed = () => {
    setStage('solved');
    const list = solved[level] ?? [];
    const firstTime = !list.includes(index);
    const nextSolved = firstTime ? { ...solved, [level]: [...list, index] } : solved;
    setSolved(nextSolved);
    persist(nextSolved, index + 1);
    const clean = mistakes === 0 && !hint.length;
    streak.current = clean ? streak.current + 1 : 0;
    shell.play('levelComplete');
    setNote(clean ? 'Checkmate! Solved first try.' : 'Checkmate! Puzzle solved.');
    const count = (nextSolved[level] ?? []).length;
    void reportProgress('chess-puzzle.first', 1);
    void reportProgress('chess-puzzle.ten', Object.values(nextSolved).reduce((n, l) => n + l.length, 0));
    if (level !== 'easy') void reportProgress('chess-puzzle.two', 1);
    void reportProgress('chess-puzzle.streak', streak.current);
    shell.endRound({
      score: (clean ? 100 : 50) * (level === 'easy' ? 1 : 2) - mistakes * 10,
      won: true,
      title: 'Puzzle solved!',
      message: `${count} of ${set.items.length} ${set.label.toLowerCase()} puzzles solved.`,
      details: [
        { label: 'Mistakes', value: String(mistakes) },
        { label: 'Clean streak', value: String(streak.current) },
      ],
    });
  };

  const onMove = (m: number) => {
    if (stage !== 'key' && stage !== 'finish') return;
    if (!begun.current) {
      begun.current = true;
      shell.startRound();
    }
    const isKey = stage === 'key';
    chess.play(m);
    setLast(m);
    setVersion((v) => v + 1);
    const mated = chess.status() === 'checkmate';
    const correct = isKey && set.movesToMate === 2 ? keyMatches(m) : mated;
    if (mated) {
      shell.play('success');
      return succeed();
    }
    if (!correct) {
      shell.play('failure');
      setMistakes((n) => n + 1);
      setNote('Not quite — that doesn’t force mate. Try again.');
      window.setTimeout(() => {
        chess.takeBack();
        setLast(null);
        setVersion((v) => v + 1);
      }, 600);
      return;
    }
    // Correct key move in a mate-in-2: the computer picks its most stubborn defence.
    shell.play('click');
    setNote('Good move! Now the reply…');
    window.setTimeout(() => {
      const replies = chess.moves();
      let best = replies[0];
      let fewest = Infinity;
      for (const r of replies) {
        chess.make(r);
        const mates = chess.moves().filter((x) => {
          chess.make(x);
          const mate = chess.inCheck() && chess.moves().length === 0;
          chess.unmake();
          return mate;
        }).length;
        chess.unmake();
        if (mates < fewest) {
          fewest = mates;
          best = r;
        }
      }
      chess.play(best);
      setLast(best);
      setStage('finish');
      setNote('Now deliver checkmate!');
      setVersion((v) => v + 1);
    }, 500);
  };

  function keyMatches(m: number): boolean {
    const uci = puzzle.move;
    const sq = (s: string) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
    return moveFrom(m) === sq(uci.slice(0, 2)) && moveTo(m) === sq(uci.slice(2, 4));
  }

  const showHint = () => {
    if (stage !== 'key') return;
    const sq = (s: string) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
    setHint(hint.length ? [sq(puzzle.move.slice(0, 2)), sq(puzzle.move.slice(2, 4))] : [sq(puzzle.move.slice(0, 2))]);
    setNote(hint.length ? 'The key move is highlighted.' : 'The piece to move is highlighted.');
  };

  const side = chess.turn === 1 ? 'White' : 'Black';
  const orientation = (set.items[index % set.items.length].fen.split(' ')[1] === 'b' ? -1 : 1) as 1 | -1;
  const doneHere = (solved[level] ?? []).includes(index % set.items.length);
  const status =
    note ??
    (stage === 'key'
      ? `${side} to move — checkmate in ${set.movesToMate}${set.movesToMate === 2 ? ' moves' : ' move'}.`
      : stage === 'finish'
        ? 'Deliver checkmate.'
        : '');

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: set.label, value: `${(index % set.items.length) + 1}/${set.items.length}` },
          { label: 'Solved', value: (solved[level] ?? []).length },
          { label: 'Mistakes', value: mistakes },
        ]}
      />
      <StatusBar>
        {status}
        {doneHere && stage === 'key' ? ' (already solved)' : ''}
      </StatusBar>
      <ChessBoard
        chess={chess}
        orientation={orientation}
        movable={(stage === 'key' || stage === 'finish') && !shell.paused ? chess.turn : null}
        onMove={onMove}
        lastMove={last}
        marks={hint}
        version={version}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <button type="button" className="btn" onClick={() => load(Math.max(0, index - 1))} disabled={index === 0}>
          ◀ Previous
        </button>
        <button type="button" className="btn" onClick={showHint} disabled={stage !== 'key'}>
          💡 Hint
        </button>
        <button type="button" className="btn" onClick={() => load(index)}>
          ↺ Retry
        </button>
        <button type="button" className={`btn ${stage === 'solved' ? 'btn-primary' : ''}`} onClick={() => load(index + 1)}>
          Next ▶
        </button>
      </div>
    </BoardLayout>
  );
}
