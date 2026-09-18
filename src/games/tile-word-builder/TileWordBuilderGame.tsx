import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { StartPanel, WordLayout, WordToast, useLetterKeys } from '../_shared/words/WordUI';
import { VALUES, bestPlay, checkPlay, newBag, refill, removeTiles } from './engine';

const TURNS = 8;
const TARGET = { easy: 120, normal: 170, hard: 230 } as const;

interface State {
  rack: string[];
  bag: string[];
  /** Indices into the rack, in the order the player picked them. */
  picked: number[];
  turn: number;
  score: number;
  best: number;
}

function TileButton({ ch, onClick, used }: { ch: string; onClick?: () => void; used?: boolean }) {
  return (
    <button
      type="button"
      className="word-tile"
      onClick={onClick}
      disabled={!onClick}
      style={{
        position: 'relative',
        opacity: used ? 0.35 : 1,
        cursor: onClick ? 'pointer' : 'default',
      }}
      aria-label={`${ch.toUpperCase()}, ${VALUES[ch]} points`}
    >
      {ch}
      <small
        style={{ position: 'absolute', right: 4, bottom: 2, fontSize: '0.55em', fontWeight: 600 }}
      >
        {VALUES[ch]}
      </small>
    </button>
  );
}

export default function TileWordBuilderGame() {
  const shell = useGameShell();
  const target = TARGET[shell.difficulty];
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');

  const start = () => {
    const [rack, bag] = refill([], newBag(createRng(Date.now())));
    setState({ rack, bag, picked: [], turn: 1, score: 0, best: 0 });
    setMessage(null);
    setPhase('playing');
    shell.startRound();
  };

  useEffect(() => shell.registerRestart(() => setPhase('ready')), [shell]);
  useEffect(() => setPhase('ready'), [shell.difficulty]);

  const finish = useCallback(
    (s: State) => {
      setPhase('done');
      void reportProgress('tile-word-builder.score', s.score);
      void reportProgress('tile-word-builder.big-word', s.best);
      if (s.score >= target) void reportProgress('tile-word-builder.target', 1);
      shell.endRound({
        score: s.score,
        won: s.score >= target,
        lost: s.score < target,
        title: s.score >= target ? 'Target reached!' : 'Game over',
        details: [
          { label: 'Target', value: String(target) },
          { label: 'Best word', value: `${s.best} points` },
        ],
      });
    },
    [shell, target],
  );

  const endTurn = (s: State, rack: string[], gained: number, note: string) => {
    const before = bestPlay(s.rack);
    const [newRack, bag] = refill(rack, s.bag);
    const next: State = {
      rack: newRack,
      bag,
      picked: [],
      turn: s.turn + 1,
      score: s.score + gained,
      best: Math.max(s.best, gained),
    };
    setMessage(
      `${note}${before && before.points > gained ? ` · Best possible was ${before.word.toUpperCase()} (${before.points})` : ''}`,
    );
    if (next.turn > TURNS || newRack.length === 0) {
      setState(next);
      finish(next);
    } else {
      setState(next);
    }
  };

  const word = state ? state.picked.map((i) => state.rack[i]).join('') : '';

  const pick = (i: number) => {
    if (!state || phase !== 'playing' || shell.paused) return;
    setState((s) => (s && !s.picked.includes(i) ? { ...s, picked: [...s.picked, i] } : s));
  };

  const submit = () => {
    if (!state || phase !== 'playing' || shell.paused) return;
    const check = checkPlay(word, state.rack);
    if (!check.ok) {
      shell.play('failure');
      setMessage(check.reason);
      return;
    }
    shell.play(check.points >= 30 ? 'levelComplete' : 'success');
    endTurn(
      state,
      removeTiles(state.rack, word),
      check.points,
      `${word.toUpperCase()} scored ${check.points}!`,
    );
  };

  const swap = () => {
    if (!state || phase !== 'playing' || shell.paused) return;
    // Return the tiles to the bag, shuffle and draw a fresh rack (costs the turn).
    const bag = createRng(Date.now()).shuffle([...state.bag, ...state.rack]);
    endTurn({ ...state, bag }, [], 0, 'Tiles swapped.');
  };

  // Typing letters picks matching unused tiles.
  const onKey = (key: string) => {
    if (!state || phase !== 'playing' || shell.paused) return;
    if (key === 'enter') return submit();
    if (key === 'backspace')
      return setState((s) => (s ? { ...s, picked: s.picked.slice(0, -1) } : s));
    const i = state.rack.findIndex((ch, idx) => ch === key && !state.picked.includes(idx));
    if (i >= 0) pick(i);
  };
  useLetterKeys(onKey, phase === 'playing' && !shell.paused);

  if (phase === 'ready' || !state) {
    return (
      <StartPanel onStart={start}>
        <p>
          You have {TURNS} turns. Each turn, make a word from your 7 letter tiles. Rare letters are
          worth more, long words get a multiplier, and using all 7 tiles earns +50. Reach {target}{' '}
          points to win.
        </p>
      </StartPanel>
    );
  }

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Turn', value: `${Math.min(state.turn, TURNS)}/${TURNS}` },
          { label: 'Score', value: `${state.score}/${target}` },
          { label: 'Tiles left', value: state.bag.length },
        ]}
      />
      <div className="tile-row" aria-label="Your word">
        {word ? (
          [...word].map((ch, i) => <TileButton key={i} ch={ch} />)
        ) : (
          <span
            className="muted small"
            style={{ minHeight: 56, display: 'grid', placeItems: 'center' }}
          >
            Tap tiles or type to build a word
          </span>
        )}
      </div>
      <div className="tile-row" role="group" aria-label="Your rack">
        {state.rack.map((ch, i) => (
          <TileButton
            key={i}
            ch={ch}
            used={state.picked.includes(i)}
            onClick={phase === 'playing' ? () => pick(i) : undefined}
          />
        ))}
      </div>
      {phase === 'playing' && (
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={word.length < 3 || shell.paused}
          >
            Play word
          </button>
          <button
            className="btn"
            onClick={() => setState({ ...state, picked: [] })}
            disabled={!word}
          >
            Clear
          </button>
          <button
            className="btn"
            onClick={() =>
              setState({
                ...state,
                picked: [],
                rack: createRng(Date.now()).shuffle([...state.rack]),
              })
            }
          >
            Shuffle
          </button>
          <button className="btn" onClick={swap} disabled={shell.paused}>
            Swap tiles
          </button>
        </div>
      )}
      <WordToast message={message} />
    </WordLayout>
  );
}
