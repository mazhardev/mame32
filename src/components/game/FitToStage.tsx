import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/** Below this the game would be too small to play; it scrolls the rest instead. */
const MIN_SCALE = 0.4;
/** Suggest turning the device when the game has to shrink more than this. */
const ROTATE_HINT_BELOW = 0.72;

type Hint = 'portrait' | 'landscape' | null;

/**
 * Makes a game fit the full-screen stage on any screen shape.
 *
 * Most games already size themselves to the stage. When one is still larger
 * (a square chess board on a landscape phone, a long card table), it is scaled
 * down as a whole so every control stays on screen without scrolling. Scaling
 * keeps hit-testing exact: pointer handlers that measure with
 * getBoundingClientRect or elementFromPoint see the scaled geometry.
 *
 * Outside full-screen play the wrappers use `display: contents`, so the normal
 * page layout is untouched.
 */
export function FitToStage({ active, children }: { active: boolean; children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState<Hint>(null);
  const hintShownRef = useRef(false);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    const body = outer?.parentElement;
    if (!outer || !inner || !body) return;

    const reset = () => {
      outer.dataset.fit = active ? 'fill' : 'off';
      outer.style.width = '';
      outer.style.height = '';
      inner.style.width = '';
      inner.style.transform = '';
    };

    if (!active) {
      reset();
      return;
    }

    let frame = 0;
    let lastScale = 1;

    const apply = () => {
      const bw = body.clientWidth;
      const bh = body.clientHeight;
      if (!bw || !bh) return;

      // 1. Measure the game's natural size at the stage width. Checking for
      //    overflow in the stretched layout is not enough: a game that stretches
      //    to the stage gets squashed (rows clipped) rather than overflowing.
      reset();
      outer.dataset.fit = 'scale';
      inner.style.width = `${bw}px`;
      const cw = Math.max(bw, inner.scrollWidth);
      const ch = Math.max(inner.offsetHeight, inner.scrollHeight);

      // 2. It fits: give it the whole stage, the way it was designed.
      if (ch <= bh + 2 && cw <= bw + 2) {
        reset();
        lastScale = 1;
        return;
      }

      // 3. Too big: scale it down as a whole.
      const scale = Math.max(MIN_SCALE, Math.min(1, bw / cw, bh / ch));
      inner.style.width = `${cw}px`;
      inner.style.transform = `scale(${scale})`;
      outer.style.width = `${Math.floor(cw * scale)}px`;
      outer.style.height = `${Math.floor(ch * scale)}px`;
      lastScale = scale;
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        apply();
        suggestRotation();
      });
    };

    // A game that has to shrink a lot would be bigger in the other orientation.
    const suggestRotation = () => {
      if (hintShownRef.current || !window.matchMedia('(pointer: coarse)').matches) return;
      const landscape = window.innerWidth > window.innerHeight;
      let next: Hint = null;
      if (lastScale < ROTATE_HINT_BELOW) next = landscape ? 'portrait' : 'landscape';
      else if (!landscape) {
        // Wide canvases in portrait: little more than a strip across the screen.
        const canvas = inner.querySelector('canvas');
        const r = canvas?.getBoundingClientRect();
        if (r && r.width > 0 && r.width / r.height > 1.3 && r.height < body.clientHeight * 0.4) {
          next = 'landscape';
        }
      }
      if (next) {
        hintShownRef.current = true;
        setHint(next);
      }
    };

    apply();
    schedule();

    const ro = new ResizeObserver(schedule);
    ro.observe(body);
    ro.observe(inner);
    const watchChildren = () => {
      for (const child of Array.from(inner.children)) ro.observe(child);
    };
    watchChildren();
    const mo = new MutationObserver(() => {
      watchChildren();
      schedule();
    });
    mo.observe(inner, { childList: true });
    window.addEventListener('orientationchange', schedule);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('orientationchange', schedule);
      outer.dataset.fit = 'off';
      outer.style.width = '';
      outer.style.height = '';
      inner.style.width = '';
      inner.style.transform = '';
    };
  }, [active]);

  // The hint is a gentle one-off; it clears itself.
  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(null), 4500);
    return () => window.clearTimeout(t);
  }, [hint]);

  useEffect(() => {
    if (!active) setHint(null);
  }, [active]);

  return (
    <>
      <div className="game-fit" ref={outerRef} data-fit="off">
        <div className="game-fit-inner" ref={innerRef}>
          {children}
        </div>
      </div>
      {active && hint && (
        <button type="button" className="rotate-hint" onClick={() => setHint(null)}>
          <span aria-hidden="true">⟳</span>
          {hint === 'portrait'
            ? 'Turn your phone upright for a bigger view'
            : 'Turn your phone sideways for a bigger view'}
        </button>
      )}
    </>
  );
}
