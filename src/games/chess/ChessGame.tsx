import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { reportProgress } from '@/achievements/AchievementService';
import { clearProgress, loadProgress, saveProgress } from '@/storage/StorageService';
import { BoardLayout, ModePicker, StatusBar } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { ChessBoard, PieceGlyph } from '../_shared/chess/ChessBoard';
import { Chess, movePromo, toUci } from '../_shared/chess/engine';
import type { Status } from '../_shared/chess/engine';
import { useChessAI } from '../_shared/chess/useChessAI';

const GAME_ID = 'chess';
const LEVEL = {
  easy: { maxDepth: 2, timeMs: 400, noise: 90 },
  normal: { maxDepth: 3, timeMs: 900, noise: 15 },
  hard: { maxDepth: 7, timeMs: 2200, noise: 0 },
} as const;
const START_COUNT = [0, 8, 2, 2, 2, 1, 1];

interface Saved {
  moves: string[];
  mode: PlayMode;
  color: 1 | -1;
}

const DRAW_TEXT: Partial<Record<Status, string>> = {
  stalemate: 'Stalemate — draw.',
  fifty: 'Draw by the fifty-move rule.',
  repetition: 'Draw by threefold repetition.',
  material: 'Draw — not enough material to checkmate.',
};

function captured(chess: Chess, side: 1 | -1): number[] {
  const count = [0, 0, 0, 0, 0, 0, 0];
  for (const p of chess.board) if (Math.sign(p) === side) count[Math.abs(p)]++;
  const out: number[] = [];
  for (let t = 5; t >= 1; t--) for (let k = count[t]; k < START_COUNT[t]; k++) out.push(t * side);
  return out;
}

export default function ChessGame() {
  const shell = useGameShell();
  const think = useChessAI();
  const chess = useRef(new Chess()).current;
  const [version, setVersion] = useState(0);
  const [mode, setMode] = useState<PlayMode>('ai');
  const [color, setColor] = useState<1 | -1>(1);
  const [flipped, setFlipped] = useState(false);
  const [uci, setUci] = useState<string[]>([]);
  const [san, setSan] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const started = useRef(false);
  const promoted = useRef(false);
  const loaded = useRef(false);

  const reset = useCallback(
    (moves: string[] = []) => {
      chess.load(new Chess().fen());
      const sanList: string[] = [];
      for (const u of moves) {
        const m = chess.fromUci(u);
        if (m === null) break;
        sanList.push(chess.san(m));
        chess.play(m);
      }
      setUci(moves.slice(0, sanList.length));
      setSan(sanList);
      setResult(null);
      setThinking(false);
      started.current = sanList.length > 0;
      promoted.current = false;
      setVersion((v) => v + 1);
    },
    [chess],
  );

  const restart = useCallback(() => {
    void clearProgress(GAME_ID);
    reset();
  }, [reset]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  // Restore an unfinished game once.
  useEffect(() => {
    void loadProgress<Saved>(GAME_ID).then((s) => {
      if (loaded.current) return;
      loaded.current = true;
      if (!s || !Array.isArray(s.moves) || !s.moves.length) return;
      setMode(s.mode === 'local' ? 'local' : 'ai');
      setColor(s.color === -1 ? -1 : 1);
      reset(s.moves.filter((m) => typeof m === 'string'));
    });
  }, [reset]);

  const finish = useCallback(
    (status: Status, resigned = false) => {
      const mover = -chess.turn as 1 | -1; // side that just moved
      let text: string;
      let won = false;
      let lost = false;
      if (resigned) {
        text = 'You resigned.';
        lost = true;
      } else if (status === 'checkmate') {
        if (mode === 'ai') {
          won = mover === color;
          lost = !won;
          text = won ? 'Checkmate — you win!' : 'Checkmate — the computer wins.';
        } else text = `Checkmate — ${mover === 1 ? 'White' : 'Black'} wins!`;
      } else text = DRAW_TEXT[status] ?? 'Draw.';
      const draw = !won && !lost && !resigned && status !== 'checkmate';
      setResult(text);
      void clearProgress(GAME_ID);
      shell.play(won || (mode === 'local' && !draw) ? 'levelComplete' : draw ? 'success' : 'gameOver');
      const fullMoves = Math.ceil(chess.full);
      if (mode === 'ai' && won) {
        void reportProgress('chess.win', 1);
        if (shell.difficulty !== 'easy') void reportProgress('chess.normal', 1);
        if (shell.difficulty === 'hard') void reportProgress('chess.hard', 1);
        if (fullMoves <= 25) void reportProgress('chess.quick', 1);
      }
      const base = { easy: 300, normal: 600, hard: 1000 }[shell.difficulty];
      shell.endRound({
        score: mode === 'ai' ? (won ? base + Math.max(0, 60 - fullMoves) * 5 : draw ? Math.round(base / 4) : 0) : 0,
        won: mode === 'ai' ? won : undefined,
        lost: mode === 'ai' ? lost : undefined,
        draw: mode === 'ai' ? draw : undefined,
        title: text,
        details: [{ label: 'Moves', value: String(fullMoves) }],
      });
    },
    [chess, color, mode, shell],
  );

  const apply = useCallback(
    (m: number) => {
      if (!started.current) {
        started.current = true;
        shell.startRound();
      }
      const moverIsHuman = mode === 'local' || chess.turn === color;
      const s = chess.san(m);
      if (movePromo(m) && moverIsHuman && mode === 'ai' && !promoted.current) {
        promoted.current = true;
        void reportProgress('chess.promote', 1);
      }
      chess.play(m);
      const nextUci = [...uci, toUci(m)];
      setUci(nextUci);
      setSan((l) => [...l, s]);
      setVersion((v) => v + 1);
      shell.play(s.includes('x') ? 'hit' : 'click');
      const status = chess.status();
      if (status !== 'play') finish(status);
      else void saveProgress(GAME_ID, { moves: nextUci, mode, color } satisfies Saved, { label: `Move ${chess.full}` });
    },
    [chess, color, finish, mode, shell, uci],
  );

  const aiTurn = mode === 'ai' && chess.turn !== color && !result;

  useEffect(() => {
    if (!aiTurn || shell.paused) return;
    let cancelled = false;
    const fen = chess.fen();
    setThinking(true);
    const t = window.setTimeout(() => {
      void think(fen, LEVEL[shell.difficulty]).then((u) => {
        if (cancelled || chess.fen() !== fen) return;
        setThinking(false);
        const m = u ? chess.fromUci(u) : null;
        if (m !== null) apply(m);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setThinking(false);
    };
    // `version` identifies the position; apply/think are stable enough per position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiTurn, version, shell.paused, shell.difficulty]);

  const changeMode = (m: PlayMode) => {
    setMode(m);
    reset();
  };
  const changeColor = (c: 1 | -1) => {
    setColor(c);
    reset();
  };

  const undo = () => {
    if (result || thinking) return;
    // Against the computer, take back your move and its reply.
    const plies = mode === 'ai' ? (chess.turn === color ? 2 : 1) : 1;
    const n = Math.min(plies, uci.length);
    if (!n) return;
    reset(uci.slice(0, uci.length - n));
    void saveProgress(GAME_ID, { moves: uci.slice(0, uci.length - n), mode, color } satisfies Saved, { label: 'In progress' });
  };

  const resign = () => {
    if (result || !uci.length) return;
    finish('play', true);
  };

  const orientation: 1 | -1 = mode === 'ai' ? color : flipped ? -1 : 1;
  const lastUci = uci[uci.length - 1];
  const inCheck = chess.inCheck();
  const whoseTurn = chess.turn === 1 ? 'White' : 'Black';
  const status =
    result ??
    (aiTurn ? 'Computer is thinking…' : mode === 'ai' ? `Your move${inCheck ? ' — check!' : ''}` : `${whoseTurn} to move${inCheck ? ' — check!' : ''}`);
  const inGame = uci.length > 0 && !result;

  // The last move is rebuilt from UCI to highlight its squares.
  const lastMove = (() => {
    if (!lastUci) return null;
    const sqFrom = (8 - Number(lastUci[1])) * 8 + 'abcdefgh'.indexOf(lastUci[0]);
    const sqTo = (8 - Number(lastUci[3])) * 8 + 'abcdefgh'.indexOf(lastUci[2]);
    return sqFrom | (sqTo << 6);
  })();

  return (
    <BoardLayout>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <ModePicker mode={mode} onChange={changeMode} disabled={inGame} />
        {mode === 'ai' && (
          <div className="seg" role="radiogroup" aria-label="Your colour">
            {([1, -1] as const).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} className={color === c ? 'on' : ''} disabled={inGame} onClick={() => changeColor(c)}>
                Play {c === 1 ? 'White' : 'Black'}
              </button>
            ))}
          </div>
        )}
      </div>
      <StatusBar>{status}</StatusBar>
      <div className="chess-captured" aria-label="Pieces captured from the side at the top">
        {captured(chess, orientation).map((p, i) => (
          <PieceGlyph key={i} piece={p} />
        ))}
      </div>
      <ChessBoard
        chess={chess}
        orientation={orientation}
        movable={result || shell.paused ? null : mode === 'ai' ? color : 'turn'}
        onMove={apply}
        lastMove={lastMove}
        version={version}
      />
      <div className="chess-captured" aria-label="Pieces captured from the side at the bottom">
        {captured(chess, -orientation as 1 | -1).map((p, i) => (
          <PieceGlyph key={i} piece={p} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <button type="button" className="btn" onClick={undo} disabled={!uci.length || !!result || thinking}>
          ↶ Undo
        </button>
        {mode === 'local' && (
          <button type="button" className="btn" onClick={() => setFlipped((f) => !f)}>
            ⇅ Flip board
          </button>
        )}
        {mode === 'ai' && (
          <button type="button" className="btn" onClick={resign} disabled={!inGame}>
            🏳 Resign
          </button>
        )}
      </div>
      {san.length > 0 && (
        <div className="chess-moves" aria-label="Move list">
          {san
            .reduce<string[]>((rows, s, i) => {
              if (i % 2 === 0) rows.push(`${i / 2 + 1}. ${s}`);
              else rows[rows.length - 1] += ` ${s}`;
              return rows;
            }, [])
            .join('   ')}
        </div>
      )}
    </BoardLayout>
  );
}
