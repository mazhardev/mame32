import { useEffect, useRef } from 'react';
import { BOOSTERS } from './boosters';
import type { Boosters } from './boosters';
import { LEVELS_PER_WORLD, WORLDS } from './levels';

const STEP = 64; // px between level nodes
const TOP = 34;

/** Horizontal position (in % of the path's width) of a node in its world. */
const xOf = (k: number) => 50 + 34 * Math.sin(k * 0.85);

function pathFor(count: number): string {
  // Path in a 100-wide viewBox; y in px since the SVG height is fixed.
  let d = `M${xOf(0)} ${TOP}`;
  for (let k = 1; k < count; k++) {
    const x0 = xOf(k - 1);
    const y0 = TOP + (k - 1) * STEP;
    const x1 = xOf(k);
    const y1 = TOP + k * STEP;
    d += ` C${x0} ${y0 + STEP / 2}, ${x1} ${y1 - STEP / 2}, ${x1} ${y1}`;
  }
  return d;
}

const PATH = pathFor(LEVELS_PER_WORLD);
const WORLD_HEIGHT = TOP * 2 + (LEVELS_PER_WORLD - 1) * STEP;

/**
 * The saga map: eight worlds, each a winding trail of fifteen levels.
 * Finished levels show their stars, the next level pulses, and everything
 * beyond it is locked.
 */
export function SagaMap({
  stars,
  unlocked,
  current,
  boosters,
  onPick,
}: {
  /** Best stars per level index (absent = not finished). */
  stars: (number | undefined)[];
  /** Highest playable level index. */
  unlocked: number;
  /** Level to centre the map on. */
  current: number;
  boosters: Boosters;
  onPick: (index: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const totalStars = stars.reduce<number>((a, s) => a + (s ?? 0), 0);

  useEffect(() => {
    const el = scroller.current;
    const node = el?.querySelector<HTMLElement>(`[data-level="${current}"]`);
    if (el && node) el.scrollTop += node.getBoundingClientRect().top - el.getBoundingClientRect().top - el.clientHeight / 2;
    // Only when the map opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cm-map">
      <div className="cm-map-bar">
        <span className="cm-map-stars" title="Stars earned">
          ★ {totalStars} / {stars.length * 3}
        </span>
        <span className="cm-map-boosters" aria-label="Boosters">
          {BOOSTERS.map((b) => (
            <span key={b.id} title={`${b.name}: ${b.help}`}>
              {b.icon}
              <b>{boosters[b.id]}</b>
            </span>
          ))}
        </span>
      </div>
      <div className="cm-map-scroll" ref={scroller}>
        {WORLDS.map((world, wi) => {
          const first = wi * LEVELS_PER_WORLD;
          const worldStars = stars.slice(first, first + LEVELS_PER_WORLD).reduce<number>((a, s) => a + (s ?? 0), 0);
          const locked = first > unlocked;
          return (
            <section key={world.name} className={`cm-world${locked ? ' locked' : ''}`} style={{ ['--world' as string]: world.color }}>
              <header className="cm-world-head">
                <div>
                  <span className="cm-world-num">World {wi + 1}</span>
                  <h3>{world.name}</h3>
                  <p>{world.blurb}</p>
                </div>
                <span className="cm-world-stars">
                  {locked ? '🔒' : `★ ${worldStars}/${LEVELS_PER_WORLD * 3}`}
                </span>
              </header>
              <div className="cm-trail" style={{ height: WORLD_HEIGHT }}>
                <svg className="cm-trail-path" viewBox={`0 0 100 ${WORLD_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
                  <path d={PATH} />
                </svg>
                {Array.from({ length: LEVELS_PER_WORLD }, (_, k) => {
                  const i = first + k;
                  const best = stars[i];
                  const open = i <= unlocked;
                  const state = !open ? 'locked' : best !== undefined ? 'done' : 'next';
                  return (
                    <button
                      key={i}
                      type="button"
                      data-level={i}
                      className={`cm-node ${state}${i === current ? ' current' : ''}${k === LEVELS_PER_WORLD - 1 ? ' boss' : ''}`}
                      style={{ left: `${xOf(k)}%`, top: TOP + k * STEP }}
                      disabled={!open}
                      onClick={() => onPick(i)}
                      aria-label={`Level ${i + 1}${open ? (best !== undefined ? `, ${best} star${best === 1 ? '' : 's'}` : ', not finished') : ', locked'}`}
                    >
                      <span className="cm-node-num">{open ? i + 1 : '🔒'}</span>
                      {best !== undefined && (
                        <span className="cm-node-stars" aria-hidden="true">
                          {'★'.repeat(best)}
                          <i>{'★'.repeat(3 - best)}</i>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        <p className="cm-map-end">🏁 The end of the candy trail</p>
      </div>
    </div>
  );
}
