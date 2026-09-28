import type { Obj, Scene } from './engine';
import { H, W } from './engine';

/** Original, simple vector drawings for every scene object (drawn in a 100-unit box). */
function Art({ o }: { o: Obj }) {
  const c = o.color;
  switch (o.kind) {
    case 'tree':
      return (
        <g>
          <rect x="-7" y="10" width="14" height="40" fill="#7c4a1e" />
          <circle cx="0" cy="-5" r="30" fill={c} />
          <circle cx="-18" cy="10" r="18" fill={c} opacity="0.85" />
          <circle cx="16" cy="12" r="16" fill="rgba(0,0,0,0.12)" />
        </g>
      );
    case 'house':
      return (
        <g>
          <rect x="-35" y="-5" width="70" height="50" fill={c} stroke="#44403c" strokeWidth="2" />
          <polygon points="-44,-5 0,-42 44,-5" fill="#b91c1c" />
          <rect x="-26" y="10" width="16" height="14" fill="#e0f2fe" stroke="#44403c" strokeWidth="2" />
          <rect x="8" y="15" width="16" height="30" fill="#78350f" />
          <rect x="20" y="-34" width="10" height="20" fill="#57534e" />
        </g>
      );
    case 'flower':
      return (
        <g>
          <rect x="-2" y="0" width="4" height="46" fill="#15803d" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-16" rx="10" ry="16" fill={c} transform={`rotate(${a})`} />
          ))}
          <circle r="9" fill="#facc15" />
        </g>
      );
    case 'mushroom':
      return (
        <g>
          <rect x="-10" y="0" width="20" height="36" rx="6" fill="#fef3c7" />
          <path d="M-40 4 A40 34 0 0 1 40 4 Z" fill={c} />
          <circle cx="-16" cy="-12" r="6" fill="#fff" />
          <circle cx="12" cy="-18" r="5" fill="#fff" />
        </g>
      );
    case 'balloon':
      return (
        <g>
          <path d="M0 40 Q 8 60 -4 80" stroke="#475569" strokeWidth="2" fill="none" />
          <ellipse cx="0" cy="0" rx="28" ry="36" fill={c} />
          <polygon points="-5,36 5,36 0,42" fill={c} />
          <ellipse cx="-10" cy="-12" rx="6" ry="10" fill="rgba(255,255,255,0.5)" />
        </g>
      );
    case 'bird':
      return (
        <g>
          <ellipse cx="0" cy="0" rx="30" ry="20" fill={c} />
          <circle cx="24" cy="-10" r="12" fill={c} />
          <polygon points="34,-12 48,-8 34,-4" fill="#f59e0b" />
          <circle cx="27" cy="-13" r="3" fill="#0f172a" />
          <path d="M-8 -6 Q 4 -34 18 -6 Z" fill="rgba(0,0,0,0.18)" />
          <polygon points="-28,-4 -48,-14 -44,6" fill={c} />
        </g>
      );
    case 'cloud':
      return (
        <g fill="#ffffff" opacity="0.95">
          <circle cx="-22" cy="4" r="20" />
          <circle cx="0" cy="-8" r="26" />
          <circle cx="24" cy="4" r="20" />
          <rect x="-40" y="4" width="80" height="18" rx="9" />
        </g>
      );
    case 'sun':
      return (
        <g>
          {Array.from({ length: 12 }, (_, k) => (
            <rect key={k} x="-3" y="-50" width="6" height="16" rx="3" fill={c} transform={`rotate(${k * 30})`} />
          ))}
          <circle r="30" fill={c} />
        </g>
      );
    case 'butterfly':
      return (
        <g>
          <ellipse cx="-18" cy="-10" rx="18" ry="22" fill={c} />
          <ellipse cx="18" cy="-10" rx="18" ry="22" fill={c} />
          <ellipse cx="-14" cy="16" rx="12" ry="14" fill={c} opacity="0.8" />
          <ellipse cx="14" cy="16" rx="12" ry="14" fill={c} opacity="0.8" />
          <rect x="-3" y="-22" width="6" height="44" rx="3" fill="#1e293b" />
        </g>
      );
    case 'kite':
      return (
        <g>
          <polygon points="0,-40 28,0 0,40 -22,0" fill={c} stroke="#1e293b" strokeWidth="2" />
          <line x1="0" y1="-40" x2="0" y2="40" stroke="#1e293b" strokeWidth="2" />
          <path d="M0 40 Q -12 60 6 72 Q 20 84 4 96" stroke="#475569" strokeWidth="2" fill="none" />
        </g>
      );
  }
}

export function SceneSvg({
  scene,
  side,
  marks,
  misses,
  label,
  onTap,
}: {
  scene: Scene;
  side: 'left' | 'right';
  marks: { x: number; y: number; r: number }[];
  misses: { x: number; y: number; key: number }[];
  label: string;
  onTap: (x: number, y: number) => void;
}) {
  const objs = side === 'left' ? scene.left : scene.right;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="sd-scene"
      role="img"
      aria-label={label}
      onPointerDown={(e) => {
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const m = svg.getScreenCTM();
        const p = m ? pt.matrixTransform(m.inverse()) : pt;
        onTap(p.x, p.y);
      }}
    >
      <rect width={W} height={H * 0.6} fill={scene.sky} />
      <rect y={H * 0.56} width={W} height={H * 0.44} fill={scene.ground} />
      <path d={`M0 ${H * 0.58} Q ${W * 0.3} ${H * 0.5} ${W * 0.6} ${H * 0.58} T ${W} ${H * 0.56} V ${H * 0.62} H 0 Z`} fill="rgba(0,0,0,0.06)" />
      {objs.map((o) => (
        <g key={o.id} transform={`translate(${o.x} ${o.y}) scale(${(o.flip ? -1 : 1) * (o.size / 100)} ${o.size / 100})`}>
          <Art o={o} />
        </g>
      ))}
      {marks.map((m, i) => (
        <circle key={i} cx={m.x} cy={m.y} r={m.r} className="sd-mark" />
      ))}
      {misses.map((m) => (
        <g key={m.key} className="sd-miss" transform={`translate(${m.x} ${m.y})`}>
          <line x1="-8" y1="-8" x2="8" y2="8" />
          <line x1="-8" y1="8" x2="8" y2="-8" />
        </g>
      ))}
    </svg>
  );
}
