import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { TOTAL, hintFor, isFinal, mix, startSet, validFound } from './engine';
import { ELEMENTS } from './recipes';
import './alchemy.css';

const ID = 'alchemy-lab';

interface Saved {
  found: string[];
  hints: number;
}

function validSaved(v: unknown): v is Saved {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return validFound(s.found) && Number.isInteger(s.hints);
}

type Flash = { kind: 'new' | 'known' | 'none'; id?: string; a: string; b: string } | null;

export default function AlchemyLabGame() {
  const shell = useGameShell();
  const save = useSavedGame(ID, validSaved);
  const [found, setFound] = useState<string[]>(startSet);
  const [hints, setHints] = useState(0);
  const [slots, setSlots] = useState<string[]>([]);
  const [flash, setFlash] = useState<Flash>(null);
  const [hint, setHint] = useState<[string, string] | null>(null);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<'new' | 'az'>('new');
  const [started, setStarted] = useState(false);
  const loaded = useRef(false);
  const clearTimer = useRef<number | undefined>();

  // Your discoveries simply carry on from last time.
  useEffect(() => {
    if (save.loading || loaded.current) return;
    loaded.current = true;
    if (save.saved) {
      setFound(save.saved.found);
      setHints(save.saved.hints);
    }
  }, [save.loading, save.saved]);
  useEffect(() => () => window.clearTimeout(clearTimer.current), []);

  const restart = useCallback(() => {
    setFound(startSet());
    setHints(0);
    setSlots([]);
    setFlash(null);
    setHint(null);
    setStarted(false);
    save.clear();
  }, [save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const pick = (id: string) => {
    if (shell.paused) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    window.clearTimeout(clearTimer.current);
    const next = slots.length >= 2 ? [id] : [...slots, id];
    setSlots(next);
    if (next.length < 2) {
      setFlash(null);
      shell.play('tick');
      return;
    }
    const [a, b] = next;
    const result = mix(a, b);
    if (!result) {
      setFlash({ kind: 'none', a, b });
      shell.play('blip');
    } else if (found.includes(result)) {
      setFlash({ kind: 'known', id: result, a, b });
      shell.play('pop');
    } else {
      const list = [...found, result];
      setFound(list);
      setFlash({ kind: 'new', id: result, a, b });
      setHint(null);
      shell.play('success');
      void incrementProgress(`${ID}.ten`);
      void incrementProgress(`${ID}.fifty`);
      void incrementProgress(`${ID}.hundred`);
      if (result === 'astronaut') void reportProgress(`${ID}.space`, 1);
      if (result === 'dragon' || result === 'unicorn') void reportProgress(`${ID}.myth`, 1);
      save.persist({ found: list, hints }, { percent: Math.round((list.length / TOTAL) * 100), label: `${list.length} of ${TOTAL} elements` });
      if (list.length === TOTAL) {
        void reportProgress(`${ID}.all`, 1);
        shell.play('levelComplete');
        shell.endRound({
          won: true,
          score: Math.max(500, TOTAL * 20 - hints * 25),
          title: 'Every element discovered! ⚗️',
          details: [
            { label: 'Elements', value: `${TOTAL}` },
            { label: 'Hints', value: String(hints) },
          ],
        });
      }
    }
    clearTimer.current = window.setTimeout(() => setSlots([]), 900);
  };

  const askHint = () => {
    const h = hintFor(found);
    if (!h) return;
    setHint([h[0], h[1]]);
    const n = hints + 1;
    setHints(n);
    save.persist({ found, hints: n }, { percent: Math.round((found.length / TOTAL) * 100), label: `${found.length} of ${TOTAL} elements` });
    shell.play('select');
  };

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = found.filter((id) => !q || ELEMENTS[id][0].toLowerCase().includes(q));
    return sort === 'az' ? [...list].sort((a, b) => ELEMENTS[a][0].localeCompare(ELEMENTS[b][0])) : [...list].reverse();
  }, [filter, found, sort]);

  const name = (id: string) => ELEMENTS[id][0];
  const icon = (id: string) => ELEMENTS[id][1];

  return (
    <div className="al-layout">
      <GameHud
        items={[
          { label: 'Discovered', value: `${found.length}/${TOTAL}` },
          { label: 'Hints', value: hints },
        ]}
      />
      <div className={`al-bench${flash?.kind === 'new' ? ' new' : ''}`} aria-live="polite">
        <div className="al-slot">{slots[0] ? <><span className="al-icon">{icon(slots[0])}</span><span>{name(slots[0])}</span></> : <span className="al-empty">Pick an element</span>}</div>
        <span className="al-op" aria-hidden="true">+</span>
        <div className="al-slot">{slots[1] ? <><span className="al-icon">{icon(slots[1])}</span><span>{name(slots[1])}</span></> : <span className="al-empty">…and another</span>}</div>
        <span className="al-op" aria-hidden="true">=</span>
        <div className={`al-slot result ${flash?.kind ?? ''}`}>
          {flash?.id ? (
            <>
              <span className="al-icon">{icon(flash.id)}</span>
              <span>{name(flash.id)}</span>
              {flash.kind === 'new' && <span className="al-badge">New!</span>}
            </>
          ) : flash?.kind === 'none' ? (
            <span className="al-empty">Nothing happens</span>
          ) : (
            <span className="al-empty">?</span>
          )}
        </div>
      </div>
      <div className="al-tools">
        <input className="input" type="search" placeholder="Find an element" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Find an element" />
        <button type="button" className="btn btn-sm" onClick={() => setSort(sort === 'new' ? 'az' : 'new')}>
          {sort === 'new' ? 'Newest first' : 'A to Z'}
        </button>
        <button type="button" className="btn btn-sm" onClick={askHint} disabled={shell.paused || found.length === TOTAL}>
          💡 Hint
        </button>
      </div>
      {hint && (
        <p className="al-hint">
          Try mixing <strong>{icon(hint[0])} {name(hint[0])}</strong> with <strong>{icon(hint[1])} {name(hint[1])}</strong>.
        </p>
      )}
      <div className="al-grid" role="group" aria-label="Your elements">
        {shown.map((id) => (
          <button
            key={id}
            type="button"
            className={`al-el${slots.includes(id) ? ' on' : ''}${isFinal(id) ? ' final' : ''}${flash?.kind === 'new' && flash.id === id ? ' fresh' : ''}`}
            onClick={() => pick(id)}
            title={isFinal(id) ? `${name(id)} (makes nothing more)` : name(id)}
          >
            <span className="al-icon">{icon(id)}</span>
            <span className="al-name">{name(id)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
