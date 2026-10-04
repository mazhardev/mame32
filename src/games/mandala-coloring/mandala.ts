import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';
import type { Region } from '../_shared/creative/regions';
import { isRecord } from '../_shared/puzzle/useSavedGame';

/**
 * Generates a mandala as SVG regions: concentric rings, each decorated with
 * one motif (petals, arches, diamonds or dots) repeated with N-fold rotational
 * symmetry. Regions of the same ring and motif share a symmetry group.
 */
export const FOLDS: Record<DifficultySetting, number> = { easy: 6, normal: 8, hard: 12 };
export const RINGS: Record<DifficultySetting, number> = { easy: 4, normal: 5, hard: 6 };

const polar = (r: number, a: number) =>
  [Math.cos(a) * r, Math.sin(a) * r].map((v) => Math.round(v * 100) / 100);

function petal(r0: number, r1: number, a: number, w: number) {
  const [x0, y0] = polar(r0, a);
  const [x1, y1] = polar(r1, a);
  const mid = (r0 + r1) / 2;
  const [cx1, cy1] = polar(mid * 1.05, a + w);
  const [cx2, cy2] = polar(mid * 1.05, a - w);
  return `M${x0},${y0} Q${cx1},${cy1} ${x1},${y1} Q${cx2},${cy2} ${x0},${y0} Z`;
}

function arch(r0: number, r1: number, a: number, half: number) {
  const [ax, ay] = polar(r0, a - half);
  const [bx, by] = polar(r1, a - half);
  const [cx, cy] = polar(r1, a + half);
  const [dx, dy] = polar(r0, a + half);
  return `M${ax},${ay} L${bx},${by} A${r1},${r1} 0 0 1 ${cx},${cy} L${dx},${dy} A${r0},${r0} 0 0 0 ${ax},${ay} Z`;
}

function annulus(r0: number, r1: number) {
  return `M${r1},0 A${r1},${r1} 0 1 1 ${-r1},0 A${r1},${r1} 0 1 1 ${r1},0 Z M${r0},0 A${r0},${r0} 0 1 0 ${-r0},0 A${r0},${r0} 0 1 0 ${r0},0 Z`;
}

export function makeMandala(seed: number, difficulty: DifficultySetting): Region[] {
  const r = createRng(`mandala-${seed}`);
  const n = FOLDS[difficulty];
  const rings = RINGS[difficulty];
  const regions: Region[] = [];
  const edges = [12];
  for (let k = 0; k < rings; k++) edges.push(edges[k] + (88 - 12) / rings);
  regions.push({ id: 'c', shape: 'circle', attrs: { cx: 0, cy: 0, r: edges[0] }, group: 'c' });
  const motifs = ['petal', 'arch', 'diamond', 'dots'] as const;
  for (let k = 0; k < rings; k++) {
    const r0 = edges[k];
    const r1 = edges[k + 1];
    regions.push({
      id: `bg${k}`,
      shape: 'path',
      attrs: { d: annulus(r0, r1), fillRule: 'evenodd' },
      group: `bg${k}`,
    });
    const motif = k === 0 ? 'petal' : motifs[r.int(0, motifs.length)];
    const count = motif === 'dots' || (k > 2 && r.next() < 0.4) ? n * 2 : n;
    const offset = r.next() < 0.5 ? 0 : Math.PI / count;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + offset - Math.PI / 2;
      const id = `${k}-${i}`;
      const group = `${k}-${motif}`;
      const span = (Math.PI * 2) / count;
      if (motif === 'petal')
        regions.push({
          id,
          shape: 'path',
          attrs: { d: petal(r0 + 1, r1 - 1, a, span * 0.45) },
          group,
        });
      else if (motif === 'arch')
        regions.push({
          id,
          shape: 'path',
          attrs: { d: arch(r0 + 2, r1 - 2, a, span * 0.38) },
          group,
        });
      else if (motif === 'diamond') {
        const mid = (r0 + r1) / 2;
        const pts = [
          polar(r0 + 1, a),
          polar(mid, a + span * 0.35),
          polar(r1 - 1, a),
          polar(mid, a - span * 0.35),
        ];
        regions.push({
          id,
          shape: 'polygon',
          attrs: { points: pts.map((p) => p.join(',')).join(' ') },
          group,
        });
      } else {
        const [x, y] = polar((r0 + r1) / 2, a);
        regions.push({
          id,
          shape: 'circle',
          attrs: {
            cx: x,
            cy: y,
            r: Math.min((r1 - r0) * 0.32, ((r0 + r1) / 2) * Math.sin(span / 2) * 0.8),
          },
          group,
        });
      }
    }
  }
  return regions;
}

export interface MandalaSave {
  seed: number;
  difficulty: DifficultySetting;
  fills: Record<string, string>;
  finished: number;
}

export function validSave(v: unknown): v is MandalaSave {
  return (
    isRecord(v) &&
    typeof v.seed === 'number' &&
    (v.difficulty === 'easy' || v.difficulty === 'normal' || v.difficulty === 'hard') &&
    isRecord(v.fills) &&
    Object.values(v.fills).every((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) &&
    typeof v.finished === 'number'
  );
}
