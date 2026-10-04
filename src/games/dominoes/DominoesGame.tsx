import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import { canMove, chooseTile, deal, draw, ends, isDouble, pass, pips, place, playableEnds, roundResult } from './engine';
import type { DominoState, End, Tile } from './engine';
import './dominoes.css';

const TARGET = 50;
const PIPS: Record<number, number[]> = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Half({ n }: { n: number }) {
  return (
    <span className="dom-half">
      {Array.from({ length: 9 }, (_, k) => (
        <i key={k} className={PIPS[n].includes(k) ? 'on' : ''} />
      ))}
    </span>
  );
}

function Domino({ tile, vertical, back, ...rest }: { tile: Tile; vertical?: boolean; back?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const inner = (
    <>
      <Half n={tile[0]} />
      <span className="dom-bar" />
      <Half n={tile[1]} />
    </>
  );
  if (rest.onClick) {
    return (
      <button type="button" {...rest} className={`dom ${vertical ? 'v' : ''} ${rest.className ?? ''}`} aria-label={`Domino ${tile[0]}–${tile[1]}`}>
        {inner}
      </button>
    );
  }
  return (
    <span className={`dom ${vertical ? 'v' : ''} ${back ? 'back' : ''}`} role="img" aria-label={back ? 'Hidden domino' : `Domino ${tile[0]}–${tile[1]}`}>
      {inner}
    </span>
  );
}

export default function DominoesGame() {
  const shell = useGameShell();
  const [s, setS] = useState<DominoState>(() => deal());
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [choose, setChoose] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [roundOver, setRoundOver] = useState(false);
  const [matchOver, setMatchOver] = useState(false);
  const started = useRef(false);
  const avoid = useRef(new Set<number>());
  const rounds = useRef(0);

  const restart = useCallback(() => {
    setS(deal());
    setScore([0, 0]);
    setChoose(null);
    setMessage(null);
    setRoundOver(false);
    setMatchOver(false);
    started.current = false;
    avoid.current = new Set();
    rounds.current = 0;
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const settle = useCallback(
    (next: DominoState) => {
      setS(next);
      const r = roundResult(next);
      if (!r) return;
      rounds.current++;
      setRoundOver(true);
      const total: [number, number] = [...score] as [number, number];
      if (r.winner !== null) total[r.winner] += r.points;
      setScore(total);
      const who = r.winner === 0 ? 'You' : r.winner === 1 ? 'The computer' : 'Nobody';
      const how = r.blocked ? 'The game is blocked. ' : '';
      setMessage(r.winner === null ? `${how}Tied pip count — no points.` : `${how}${who} ${r.winner === 0 ? 'win' : 'wins'} the round and ${r.winner === 0 ? 'score' : 'scores'} ${r.points}.`);
      shell.play(r.winner === 0 ? 'success' : 'failure');
      if (r.winner === 0 && !r.blocked) void reportProgress('dominoes.domino', 1);
      if (total[0] >= TARGET || total[1] >= TARGET) {
        const won = total[0] > total[1];
        setMatchOver(true);
        shell.play(won ? 'levelComplete' : 'gameOver');
        if (won) {
          void reportProgress('dominoes.win', 1);
          if (shell.difficulty === 'hard') void reportProgress('dominoes.hard', 1);
          if (total[1] === 0) void reportProgress('dominoes.shutout', 1);
        }
        shell.endRound({
          score: won ? total[0] * 10 : 0,
          won,
          lost: !won,
          title: won ? `You win the match ${total[0]}–${total[1]}!` : `The computer wins the match ${total[1]}–${total[0]}.`,
          details: [
            { label: 'Rounds', value: String(rounds.current) },
            { label: 'Your points', value: String(total[0]) },
            { label: 'Computer points', value: String(total[1]) },
          ],
        });
      }
    },
    [score, shell],
  );

  const begin = () => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
  };

  const playTile = (index: number, end: End) => {
    begin();
    setChoose(null);
    setMessage(null);
    shell.play('card');
    settle(place(s, index, end));
  };

  const onTile = (index: number) => {
    if (s.turn !== 0 || roundOver || shell.paused) return;
    const options = playableEnds(s.chain, s.hands[0][index]);
    if (!options.length) return;
    const e = ends(s.chain);
    if (options.length === 2 && e && e[0] !== e[1]) setChoose(index);
    else playTile(index, options[0]);
  };

  const onDraw = () => {
    if (s.turn !== 0 || roundOver || canMove(s, 0)) return;
    begin();
    const e = ends(s.chain);
    if (e) {
      avoid.current.add(e[0]);
      avoid.current.add(e[1]);
    }
    if (s.boneyard.length) {
      shell.play('pop');
      setS(draw(s));
    } else {
      setMessage('You pass.');
      settle(pass(s));
    }
  };

  useComputerTurn(
    s.turn === 1 && !roundOver && !shell.paused,
    () => true,
    () => {
      begin();
      if (canMove(s, 1)) {
        const c = chooseTile(s, shell.difficulty, avoid.current);
        if (!c) return;
        shell.play('card');
        const t = s.hands[1][c.index];
        setMessage(`Computer played ${t[0]}–${t[1]}.`);
        settle(place(s, c.index, c.end));
      } else if (s.boneyard.length) {
        setMessage('Computer draws a tile…');
        setS(draw(s));
      } else {
        setMessage('Computer passes.');
        settle(pass(s));
      }
    },
    s,
    650,
  );

  const nextRound = () => {
    const d = deal();
    setS(d);
    setRoundOver(false);
    setMessage(null);
    avoid.current = new Set();
  };

  const mine = s.hands[0];
  const myMove = s.turn === 0 && !roundOver;
  const stuck = myMove && !canMove(s, 0);
  const status =
    message ??
    (s.turn === 1 ? 'Computer is thinking…' : !s.chain.length ? 'Your lead — play any tile.' : stuck ? (s.boneyard.length ? 'No match — draw a tile.' : 'No match and the boneyard is empty — pass.') : 'Your turn — play a highlighted tile.');

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'You', value: score[0] },
          { label: 'Computer', value: score[1] },
          { label: 'Boneyard', value: s.boneyard.length },
          { label: 'Target', value: TARGET },
        ]}
      />
      <div className="dom-opp" aria-label={`Computer has ${s.hands[1].length} tiles`}>
        {s.hands[1].map((t, i) => (roundOver ? <Domino key={i} tile={t} /> : <Domino key={i} tile={t} back />))}
      </div>
      <StatusBar>{status}</StatusBar>
      <div className="dom-chain" aria-label="Line of play">
        {s.chain.length ? s.chain.map((t, i) => <Domino key={`${t[0]}-${t[1]}-${i}`} tile={t} vertical={isDouble(t)} />) : <span style={{ color: '#bbf7d0' }}>Empty table</span>}
      </div>
      {choose !== null && (
        <div className="dom-ends">
          <button type="button" className="btn" onClick={() => playTile(choose, 'L')}>
            ◀ Left end
          </button>
          <button type="button" className="btn" onClick={() => playTile(choose, 'R')}>
            Right end ▶
          </button>
        </div>
      )}
      <div className="dom-hand" aria-label="Your tiles">
        {mine.map((t, i) => {
          const ok = myMove && playableEnds(s.chain, t).length > 0;
          return <Domino key={`${t[0]}-${t[1]}`} tile={t} vertical className={ok ? 'playable' : ''} disabled={!ok || shell.paused} onClick={() => onTile(i)} />;
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {stuck && (
          <button type="button" className="btn btn-primary" onClick={onDraw}>
            {s.boneyard.length ? 'Draw a tile' : 'Pass'}
          </button>
        )}
        {roundOver && !matchOver && (
          <button type="button" className="btn btn-primary" onClick={nextRound}>
            Next round
          </button>
        )}
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Your pips: {pips(mine)}</span>
      </div>
    </BoardLayout>
  );
}
