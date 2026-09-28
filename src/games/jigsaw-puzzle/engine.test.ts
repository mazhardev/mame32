import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { GRID, PICTURE, edgeSigns, home, layoutFor, makeTabs, piecePath, scatter, trySnap } from './engine';

describe('jigsaw cutting', () => {
  it('gives neighbours opposite knobs so they interlock', () => {
    const { cols, rows } = GRID.normal;
    const tabs = makeTabs(cols, rows, createRng(1).next);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s = edgeSigns(tabs, cols, rows, r, c);
        if (c < cols - 1) expect(s.right).toBe(-edgeSigns(tabs, cols, rows, r, c + 1).left);
        if (r < rows - 1) expect(s.bottom).toBe(-edgeSigns(tabs, cols, rows, r + 1, c).top);
      }
    }
  });

  it('keeps the outside border straight', () => {
    const tabs = makeTabs(4, 3, createRng(2).next);
    expect(edgeSigns(tabs, 4, 3, 0, 0).top).toBe(0);
    expect(edgeSigns(tabs, 4, 3, 0, 0).left).toBe(0);
    expect(edgeSigns(tabs, 4, 3, 2, 3).bottom).toBe(0);
    expect(edgeSigns(tabs, 4, 3, 2, 3).right).toBe(0);
    // A corner piece has only two knobbed edges: 4 commands each + moves.
    const path = piecePath(tabs, 4, 3, 0, 0, 160, 160);
    expect(path.startsWith('M0 0')).toBe(true);
    expect(path.match(/C/g)).toHaveLength(6);
  });
});

describe('jigsaw table', () => {
  it('scatters every piece off the picture area', () => {
    for (const kind of ['wide', 'tall'] as const) {
      const layout = layoutFor(kind);
      const { cols, rows } = GRID.hard;
      const pieces = scatter(layout, cols, rows, createRng(kind).next);
      expect(pieces).toHaveLength(cols * rows);
      for (const p of pieces) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x + PICTURE.w / cols).toBeLessThanOrEqual(layout.w);
        expect(p.y + PICTURE.h / rows).toBeLessThanOrEqual(layout.h);
        const inside = p.x > layout.px && p.x < layout.px + PICTURE.w && p.y > layout.py && p.y < layout.py + PICTURE.h;
        expect(inside).toBe(false);
      }
    }
  });

  it('snaps pieces dropped near home and leaves others alone', () => {
    const layout = layoutFor('wide');
    const [hx, hy] = home(layout, 4, 3, { r: 1, c: 2 });
    const near = trySnap(layout, 4, 3, { r: 1, c: 2, x: hx + 20, y: hy - 15, locked: false });
    expect(near).toMatchObject({ x: hx, y: hy, locked: true });
    const far = trySnap(layout, 4, 3, { r: 1, c: 2, x: hx + 90, y: hy, locked: false });
    expect(far.locked).toBe(false);
  });
});
