import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import { Felt } from '../_shared/cards/table';
import { COLORS, bestColor, canPlay, cardPoints, choose, deal, drawCard, pass, penalty, playCard, seatAfter, top } from './engine';
import type { CMCard, CMState, Color } from './engine';
import './cm.css';

const NAMES = ['You', 'Ava', 'Ben', 'Cleo'];
const SYMBOL: Record<string, string> = { skip: '⊘', reverse: '⇄', draw2: '+2', wild: '★', wild4: '+4' };
const WORD: Record<string, string> = { skip: 'Skip', reverse: 'Reverse', draw2: 'Draw Two', wild: 'Wild', wild4: 'Wild Draw Four' };
const label = (c: CMCard) => `${c.color === 'wild' ? '' : c.color + ' '}${WORD[c.value] ?? c.value}`;

function CMFace({ card, width, onClick, playable, disabled }: { card: CMCard; width: number; onClick?: () => void; playable?: boolean; disabled?: boolean }) {
  const text = SYMBOL[card.value] ?? card.value;
  return (
    <button type="button" className={`cm-card ${card.color} ${playable ? 'playable' : ''}`} style={{ ['--w' as string]: `${width}px` }} onClick={onClick} disabled={disabled || !onClick} aria-label={label(card)}>
      <small>{text}</small>
      <span>{text}</span>
    </button>
  );
}

export default function ColorMatchGame() {
  const shell = useGameShell();
  const width = typeof window !== 'undefined' && window.innerWidth < 420 ? 44 : 58;
  const [players, setPlayers] = useState(3);
  const [s, setS] = useState<CMState>(() => deal(3));
  const [pending, setPending] = useState<CMCard | null>(null);
  const [called, setCalled] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const started = useRef(false);
  const plusFours = useRef(0);

  const restart = useCallback(() => {
    setS(deal(players));
    setPending(null);
    setCalled(false);
    setNote(null);
    setOver(false);
    started.current = false;
    plusFours.current = 0;
  }, [players]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const begin = () => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
  };

  const after = (next: CMState, who: number, card: CMCard) => {
    setS(next);
    shell.play(card.value === 'wild4' || card.value === 'draw2' ? 'hit' : card.color === 'wild' ? 'powerup' : 'card');
    if (next.hands[who].length) return;
    setOver(true);
    const pts = next.hands.reduce((n, h, i) => (i === who ? n : n + h.reduce((a, c) => a + cardPoints(c), 0)), 0);
    const won = who === 0;
    const text = won ? `You matched out first and score ${pts}!` : `${NAMES[who]} went out first.`;
    setNote(text);
    shell.play(won ? 'levelComplete' : 'gameOver');
    if (won) {
      void reportProgress('color-match-cards.win', 1);
      if (players === 4) void reportProgress('color-match-cards.four', 1);
      if (card.color === 'wild') void reportProgress('color-match-cards.wild', 1);
    }
    shell.endRound({
      score: won ? pts * 5 : 0,
      won,
      lost: !won,
      title: text,
      details: next.hands.map((h, i) => ({ label: NAMES[i], value: `${h.length} cards` })),
    });
  };

  const humanPlay = (card: CMCard, color?: Color) => {
    begin();
    setPending(null);
    let next = playCard(s, card, color);
    // Forgetting to call "One!" with your second-to-last card costs two cards (Normal and Hard).
    if (s.hands[0].length === 2 && !called && shell.difficulty !== 'easy') {
      next = penalty(next, 0);
      setNote('You forgot to call “One!” — draw two.');
      shell.play('failure');
    } else setNote(s.hands[0].length === 2 ? 'One card left!' : null);
    if (card.value === 'wild4') {
      plusFours.current++;
      void reportProgress('color-match-cards.plus4', plusFours.current);
    }
    setCalled(false);
    after(next, 0, card);
  };

  const onCard = (card: CMCard) => {
    if (over || shell.paused || s.turn !== 0 || !canPlay(s, card)) return;
    if (card.color === 'wild') return setPending(card);
    humanPlay(card);
  };

  const onDraw = () => {
    if (over || shell.paused || s.turn !== 0) return;
    begin();
    if (!s.drew) {
      const next = drawCard(s);
      setS(next);
      const got = next.hands[0][next.hands[0].length - 1];
      setNote(`You drew ${label(got)}${canPlay(next, got) ? ' — you can play it.' : '.'}`);
      shell.play('card');
    } else {
      setS(pass(s));
      setNote('You pass.');
    }
  };

  useComputerTurn(
    !over && s.turn !== 0 && !shell.paused,
    () => true,
    () => {
      const who = s.turn;
      const pick = choose(s, shell.difficulty);
      if (pick) {
        const victim = NAMES[seatAfter(s)];
        const effect = pick.card.value === 'draw2' ? ` ${victim} draws 2.` : pick.card.value === 'wild4' ? ` ${victim} draws 4.` : pick.card.value === 'skip' ? ` ${victim} is skipped.` : '';
        setNote(`${NAMES[who]} plays ${label(pick.card)}${pick.color ? ` and picks ${pick.color}` : ''}.${effect}${s.hands[who].length === 2 ? ' “One!”' : ''}`);
        after(playCard(s, pick.card, pick.color), who, pick.card);
      } else if (!s.drew) {
        setS(drawCard(s));
        setNote(`${NAMES[who]} draws.`);
      } else {
        setS(pass(s));
        setNote(`${NAMES[who]} passes.`);
      }
    },
    `${s.turn}-${s.drew}-${s.discard.length}-${s.hands.map((h) => h.length).join()}`,
    700,
  );

  const myTurn = s.turn === 0 && !over;
  const canAny = s.hands[0].some((c) => canPlay(s, c));

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Your cards', value: s.hands[0].length },
          { label: 'Colour', value: s.color },
          { label: 'Direction', value: s.dir === 1 ? '↻' : '↺' },
        ]}
      />
      <div className="seg" role="radiogroup" aria-label="Players">
        {[2, 3, 4].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={players === n} className={players === n ? 'on' : ''} disabled={started.current && !over} onClick={() => setPlayers(n)}>
            {n} players
          </button>
        ))}
      </div>
      <StatusBar>{note ?? (myTurn ? (canAny ? 'Your turn — match the colour or symbol.' : s.drew ? 'No match — pass.' : 'No match — draw a card.') : `${NAMES[s.turn]} is playing…`)}</StatusBar>
      <Felt>
        <div className="card-row" style={{ gap: 12 }}>
          {s.hands.slice(1).map((h, i) => (
            <div key={i} className="chip-count" style={{ outline: s.turn === i + 1 ? '2px solid #facc15' : undefined }}>
              {NAMES[i + 1]}: {h.length}
            </div>
          ))}
        </div>
        <div className="card-row" style={{ gap: 18, alignItems: 'center' }}>
          <button type="button" className="cm-card back" style={{ ['--w' as string]: `${width + 8}px` }} onClick={onDraw} disabled={!myTurn || canAny} aria-label="Draw pile">
            <span>DRAW</span>
          </button>
          <div style={{ position: 'relative' }}>
            <CMFace card={top(s)} width={width + 8} />
            <span className="chip-count" style={{ position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
              {s.color}
            </span>
          </div>
        </div>
        <div className="cm-hand" aria-label="Your hand">
          {s.hands[0].map((c) => {
            const ok = myTurn && canPlay(s, c);
            return <CMFace key={c.id} card={c} width={width} playable={ok} onClick={ok ? () => onCard(c) : undefined} />;
          })}
        </div>
      </Felt>
      {pending && (
        <div className="bet-row" role="group" aria-label="Choose a colour">
          {COLORS.map((col) => (
            <button key={col} type="button" className="btn" onClick={() => humanPlay(pending, col)} style={{ background: { red: '#e11d48', yellow: '#eab308', green: '#16a34a', blue: '#2563eb' }[col], color: '#fff', outline: bestColor(s.hands[0].filter((c) => c.id !== pending.id)) === col ? '2px solid #fff' : undefined }}>
              {col}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {myTurn && s.hands[0].length === 2 && canAny && (
          <button type="button" className={`btn ${called ? '' : 'btn-primary'}`} onClick={() => setCalled(true)} disabled={called}>
            {called ? '“One!” called' : 'Call “One!”'}
          </button>
        )}
        {myTurn && !canAny && (
          <button type="button" className="btn btn-primary" onClick={onDraw}>
            {s.drew ? 'Pass' : 'Draw a card'}
          </button>
        )}
      </div>
    </BoardLayout>
  );
}
