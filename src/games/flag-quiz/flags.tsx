import type { ReactNode } from 'react';

type Design =
  | { kind: 'h' | 'v'; colors: string[]; weights?: number[] }
  | { kind: 'nordic'; bg: string; cross: string; inner?: string }
  | { kind: 'disc'; bg: string; disc: string; cx?: number; r?: number }
  | { kind: 'laos' }
  | { kind: 'swiss' }
  | { kind: 'greece' };

export interface Flag {
  country: string;
  level: 1 | 2 | 3;
  design: Design;
}

const W = '#ffffff';

/** Simplified but faithful renderings: correct colours, stripe order and proportions. */
export const FLAGS: Flag[] = [
  { country: 'France', level: 1, design: { kind: 'v', colors: ['#0055A4', W, '#EF4135'] } },
  { country: 'Italy', level: 1, design: { kind: 'v', colors: ['#009246', W, '#CE2B37'] } },
  {
    country: 'Germany',
    level: 1,
    design: { kind: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] },
  },
  { country: 'Japan', level: 1, design: { kind: 'disc', bg: W, disc: '#BC002D' } },
  { country: 'Russia', level: 1, design: { kind: 'h', colors: [W, '#0039A6', '#D52B1E'] } },
  { country: 'Ireland', level: 1, design: { kind: 'v', colors: ['#169B62', W, '#FF883E'] } },
  { country: 'Sweden', level: 1, design: { kind: 'nordic', bg: '#006AA7', cross: '#FECC00' } },
  { country: 'Switzerland', level: 1, design: { kind: 'swiss' } },
  { country: 'Ukraine', level: 1, design: { kind: 'h', colors: ['#0057B7', '#FFD700'] } },
  { country: 'Greece', level: 1, design: { kind: 'greece' } },
  { country: 'Netherlands', level: 2, design: { kind: 'h', colors: ['#AE1C28', W, '#21468B'] } },
  {
    country: 'Belgium',
    level: 2,
    design: { kind: 'v', colors: ['#000000', '#FAE042', '#ED2939'] },
  },
  { country: 'Denmark', level: 2, design: { kind: 'nordic', bg: '#C8102E', cross: W } },
  {
    country: 'Norway',
    level: 2,
    design: { kind: 'nordic', bg: '#BA0C2F', cross: W, inner: '#00205B' },
  },
  { country: 'Finland', level: 2, design: { kind: 'nordic', bg: W, cross: '#002F6C' } },
  { country: 'Poland', level: 2, design: { kind: 'h', colors: [W, '#DC143C'] } },
  { country: 'Austria', level: 2, design: { kind: 'h', colors: ['#ED2939', W, '#ED2939'] } },
  { country: 'Indonesia', level: 2, design: { kind: 'h', colors: ['#CE1126', W] } },
  { country: 'Nigeria', level: 2, design: { kind: 'v', colors: ['#008751', W, '#008751'] } },
  {
    country: 'Bangladesh',
    level: 2,
    design: { kind: 'disc', bg: '#006A4E', disc: '#F42A41', cx: 0.45, r: 0.33 },
  },
  {
    country: 'Colombia',
    level: 2,
    design: { kind: 'h', colors: ['#FCD116', '#003893', '#CE1126'], weights: [2, 1, 1] },
  },
  {
    country: 'Thailand',
    level: 2,
    design: {
      kind: 'h',
      colors: ['#A51931', W, '#2D2A4A', W, '#A51931'],
      weights: [1, 1, 2, 1, 1],
    },
  },
  { country: 'Peru', level: 2, design: { kind: 'v', colors: ['#D91023', W, '#D91023'] } },
  {
    country: 'Iceland',
    level: 3,
    design: { kind: 'nordic', bg: '#02529C', cross: W, inner: '#DC1E35' },
  },
  { country: 'Hungary', level: 3, design: { kind: 'h', colors: ['#CD2A3E', W, '#436F4D'] } },
  { country: 'Bulgaria', level: 3, design: { kind: 'h', colors: [W, '#00966E', '#D62612'] } },
  {
    country: 'Romania',
    level: 3,
    design: { kind: 'v', colors: ['#002B7F', '#FCD116', '#CE1126'] },
  },
  { country: 'Estonia', level: 3, design: { kind: 'h', colors: ['#0072CE', '#000000', W] } },
  {
    country: 'Lithuania',
    level: 3,
    design: { kind: 'h', colors: ['#FDB913', '#006A44', '#C1272D'] },
  },
  {
    country: 'Armenia',
    level: 3,
    design: { kind: 'h', colors: ['#D90012', '#0033A0', '#F2A800'] },
  },
  { country: 'Yemen', level: 3, design: { kind: 'h', colors: ['#CE1126', W, '#000000'] } },
  { country: 'Sierra Leone', level: 3, design: { kind: 'h', colors: ['#1EB53A', W, '#0072C6'] } },
  { country: 'Gabon', level: 3, design: { kind: 'h', colors: ['#009E60', '#FCD116', '#3A75C4'] } },
  { country: 'Mali', level: 3, design: { kind: 'v', colors: ['#14B53A', '#FCD116', '#CE1126'] } },
  { country: 'Guinea', level: 3, design: { kind: 'v', colors: ['#CE1126', '#FCD116', '#009460'] } },
  { country: 'Ivory Coast', level: 3, design: { kind: 'v', colors: ['#F77F00', W, '#009E60'] } },
  { country: 'Laos', level: 3, design: { kind: 'laos' } },
];

function stripes(kind: 'h' | 'v', colors: string[], weights?: number[]): ReactNode[] {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let at = 0;
  return colors.map((c, i) => {
    const size = (w[i] / total) * (kind === 'h' ? 100 : 150);
    const rect =
      kind === 'h' ? (
        <rect key={i} x={0} y={at} width={150} height={size + 0.5} fill={c} />
      ) : (
        <rect key={i} x={at} y={0} width={size + 0.5} height={100} fill={c} />
      );
    at += size;
    return rect;
  });
}

function body(d: Design): ReactNode {
  switch (d.kind) {
    case 'h':
    case 'v':
      return stripes(d.kind, d.colors, d.weights);
    case 'nordic': {
      // Cross centre sits left of middle, as on all Nordic flags.
      const outer = d.inner ? 18 : 14;
      const cx = 55;
      return (
        <>
          <rect width={150} height={100} fill={d.bg} />
          <rect x={cx - outer / 2} y={0} width={outer} height={100} fill={d.cross} />
          <rect x={0} y={50 - outer / 2} width={150} height={outer} fill={d.cross} />
          {d.inner && (
            <>
              <rect x={cx - 4.5} y={0} width={9} height={100} fill={d.inner} />
              <rect x={0} y={45.5} width={150} height={9} fill={d.inner} />
            </>
          )}
        </>
      );
    }
    case 'disc':
      return (
        <>
          <rect width={150} height={100} fill={d.bg} />
          <circle cx={150 * (d.cx ?? 0.5)} cy={50} r={100 * (d.r ?? 0.3)} fill={d.disc} />
        </>
      );
    case 'laos':
      return (
        <>
          <rect width={150} height={100} fill="#CE1126" />
          <rect y={25} width={150} height={50} fill="#002868" />
          <circle cx={75} cy={50} r={20} fill={W} />
        </>
      );
    case 'swiss':
      return (
        <>
          <rect x={25} width={100} height={100} fill="#DA291C" />
          <rect x={65} y={20} width={20} height={60} fill={W} />
          <rect x={45} y={40} width={60} height={20} fill={W} />
        </>
      );
    case 'greece': {
      const blue = '#0D5EAF';
      const h = 100 / 9;
      return (
        <>
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} y={i * h} width={150} height={h + 0.3} fill={i % 2 ? W : blue} />
          ))}
          <rect width={h * 5} height={h * 5} fill={blue} />
          <rect x={h * 2} width={h} height={h * 5} fill={W} />
          <rect y={h * 2} width={h * 5} height={h} fill={W} />
        </>
      );
    }
  }
}

export function FlagImage({ flag, width = 180 }: { flag: Flag; width?: number }) {
  return (
    <svg
      viewBox="0 0 150 100"
      width={width}
      height={(width * 2) / 3}
      role="img"
      aria-label="flag"
      style={{ borderRadius: 6, boxShadow: '0 0 0 1px var(--border-strong), var(--shadow-sm)' }}
    >
      {body(flag.design)}
    </svg>
  );
}
