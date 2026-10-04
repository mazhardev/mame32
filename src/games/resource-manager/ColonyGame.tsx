import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import {
  JOBS,
  MODULES,
  MODULE,
  TUNING,
  cancelProject,
  capacity,
  forecast,
  housing,
  idle,
  newColony,
  nextDay,
  score,
  setJob,
  slotsFor,
  startProject,
  validColony,
  working,
} from './engine';
import type { Colony, Job } from './engine';
import './colony.css';

function Delta({ v }: { v: number }) {
  return <span className={v < 0 ? 'rm-neg' : 'rm-pos'}>{v >= 0 ? `+${v}` : v}</span>;
}

export default function ColonyGame() {
  const shell = useGameShell();
  const d = shell.difficulty;
  const t = TUNING[d];
  const [c, setC] = useState<Colony>(() => newColony(Math.floor(Math.random() * 1e9)));
  const [started, setStarted] = useState(false);
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('resource-manager', validColony);
  const [pending, setPending] = useState<Colony | null>(null);
  /** Colonists lost when the current dust storm began (null when there is none). */
  const stormLost = useRef<number | null>(null);

  useEffect(() => {
    if (save.saved) setPending(save.saved);
  }, [save.saved]);

  const restart = useCallback(() => {
    setC(newColony(Math.floor(Math.random() * 1e9)));
    setPending(null);
    setStarted(false);
    save.clear();
  }, [save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const act = (fn: () => unknown, sound: 'click' | 'success' | 'select' = 'click') => {
    if (c.over || pending || shell.paused) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    const ok = fn();
    if (ok !== false) shell.play(sound);
    else shell.play('failure');
    refresh();
  };

  const advance = () =>
    act(() => {
      const wasStorm = c.storm > 0;
      const ev = nextDay(c, d);
      if (ev.includes('storm')) stormLost.current = c.lost;
      if (wasStorm && c.storm === 0 && stormLost.current !== null) {
        if (c.lost === stormLost.current) void reportProgress('resource-manager.storm', 1);
        stormLost.current = null;
      }
      if (ev.includes('death')) shell.play('failure');
      else if (ev.includes('shuttle')) shell.play('success');
      else if (ev.includes('meteor')) shell.play('explosion');
      if (ev.includes('built')) void incrementProgress('resource-manager.modules', 1);
      if (ev.includes('repaired')) void reportProgress('resource-manager.repair', 1);
      void reportProgress('resource-manager.colonists', c.colonists);
      if (c.over) {
        const won = c.over === 'won';
        save.clear();
        if (won) void reportProgress('resource-manager.goal', 1);
        if (won && c.lost === 0) void reportProgress('resource-manager.nobody', 1);
        if (won && d === 'hard') void reportProgress('resource-manager.hard', 1);
        shell.endRound({
          won,
          lost: !won,
          score: Math.max(0, score(c, d)),
          title: won
            ? `The colony is thriving: ${c.colonists} colonists on day ${c.day - 1}!`
            : c.over === 'lost'
              ? 'The colony was lost'
              : `Time is up with ${c.colonists} colonists`,
          details: [
            { label: 'Colonists', value: `${c.colonists} / ${t.goal}` },
            { label: 'Colonists lost', value: String(c.lost) },
            { label: 'Days', value: String(c.day - 1) },
          ],
        });
        return;
      }
      c.savedAt = Date.now();
      save.persist(JSON.parse(JSON.stringify(c)) as Colony, {
        percent: Math.round((c.colonists / t.goal) * 100),
        label: `Day ${c.day} · ${c.colonists} colonists`,
      });
    }, 'select');

  const f = forecast(c);
  const cap = capacity(c);
  const free = idle(c);
  const powerShort = f.power.made < f.power.used;

  return (
    <div className="rm">
      <GameHud
        items={[
          { label: 'Day', value: `${Math.min(c.day, t.days)}/${t.days}` },
          { label: 'Colonists', value: `${c.colonists}/${t.goal}` },
          { label: 'Homes', value: housing(c) },
          { label: 'Health', value: `${c.health}%` },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`Day ${pending.day} · ${pending.colonists} colonists`}
          onContinue={() => {
            setC(pending);
            setPending(null);
            save.dismiss();
          }}
          onNew={restart}
        />
      )}
      <div className={`rm-log small${c.stormWarning || c.storm ? ' warn' : ''}`} aria-live="polite">
        {c.log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        {c.storm > 0 && (
          <div>
            🌪️ Dust storm: {c.storm} more day{c.storm > 1 ? 's' : ''}
          </div>
        )}
      </div>
      <section className="rm-res" aria-label="Supplies">
        <div>
          🍲 <strong>{c.res.food}</strong>/{cap} <Delta v={f.food} />
        </div>
        <div>
          💧 <strong>{c.res.water}</strong>/{cap} <Delta v={f.water} />
        </div>
        <div className={powerShort ? 'rm-neg' : ''}>
          ⚡ {f.power.made} made / {f.power.used} used
          {powerShort ? ` · ${Math.round(f.efficiency * 100)}% output` : ''}
        </div>
        <div>
          🔩 <strong>{c.res.metal}</strong>/{cap} <Delta v={f.metal} />
        </div>
      </section>
      <section className="rm-jobs" aria-label="Jobs">
        <div className="rm-jobs-head small">
          <strong>Assign colonists</strong>
          <span className={free ? 'rm-pos' : 'muted'}>{free} idle</span>
        </div>
        {JOBS.map((j) => {
          const slots = slotsFor(c, j.id as Job);
          return (
            <div key={j.id} className="rm-job">
              <span className="rm-job-name">
                {j.icon} {j.name}
                <span className="small muted">
                  {j.slots ? ` (max ${slots})` : ' build & repair'}
                </span>
              </span>
              <span className="rm-step">
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Fewer ${j.name}`}
                  onClick={() => act(() => setJob(c, j.id, c.jobs[j.id] - 1))}
                  disabled={c.jobs[j.id] === 0}
                >
                  −
                </button>
                <strong aria-live="polite">{c.jobs[j.id]}</strong>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`More ${j.name}`}
                  onClick={() => act(() => setJob(c, j.id, c.jobs[j.id] + 1))}
                  disabled={free === 0 || c.jobs[j.id] >= slots}
                >
                  +
                </button>
              </span>
            </div>
          );
        })}
      </section>
      <section className="rm-build" aria-label="Construction">
        <div className="rm-jobs-head small">
          <strong>Construction</strong>
          {c.project ? (
            <span>
              {MODULE[c.project].icon} {MODULE[c.project].name}: {c.progress}/
              {MODULE[c.project].work} work{' '}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => act(() => cancelProject(c))}
              >
                Cancel
              </button>
            </span>
          ) : (
            <span className="muted">Pick a module — engineers build it</span>
          )}
        </div>
        <div className="rm-mods">
          {MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="rm-mod"
              disabled={!!c.project || c.res.metal < m.metal}
              onClick={() => act(() => startProject(c, m.id), 'success')}
              title={m.desc}
            >
              <span className="rm-mod-top">
                <span>{m.icon}</span>
                <strong>{m.name}</strong>
                <span className="rm-count">
                  {working(c, m.id)}
                  {c.broken[m.id] ? <span className="rm-neg"> (+{c.broken[m.id]}💥)</span> : null}
                </span>
              </span>
              <span className="small muted">{m.desc}</span>
              <span className="small">
                🔩{m.metal} · {m.work} work{m.power ? ` · ⚡${m.power}` : ''}
              </span>
            </button>
          ))}
        </div>
      </section>
      <div className="rm-actions">
        <button type="button" className="btn btn-primary" onClick={advance} disabled={!!c.over}>
          🌙 End day {c.day}
        </button>
      </div>
    </div>
  );
}
