import { COLOR_HEX, HAIR_COLORS, SKINS, THEMES } from './wardrobe';
import type { Look, Theme } from './wardrobe';

/** Darkens a #rrggbb colour for outlines and shading. */
function shade(hex: string, f = 0.75) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * f);
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

const OUTLINE = 'rgba(15,23,42,0.35)';

function Hair({ style, color, back }: { style: Look['hair']; color: string; back: boolean }) {
  if (back) {
    if (style === 'long')
      return <path d="M72 52 Q70 120 80 128 L120 128 Q130 120 128 52 Z" fill={color} />;
    if (style === 'bun') return <circle cx={100} cy={26} r={13} fill={color} />;
    return null;
  }
  switch (style) {
    case 'short':
    case 'long':
    case 'bun':
      return (
        <path d="M74 58 Q74 28 100 28 Q126 28 126 58 Q118 42 100 44 Q84 44 74 58 Z" fill={color} />
      );
    case 'curly':
      return (
        <g fill={color}>
          {[76, 86, 98, 110, 122].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 34 : 40} r={11} />
          ))}
          <circle cx={73} cy={54} r={8} />
          <circle cx={127} cy={54} r={8} />
        </g>
      );
    case 'spiky':
      return (
        <path
          d="M74 56 L72 34 L84 40 L88 22 L98 36 L106 20 L112 36 L124 26 L122 42 L130 46 L126 58 Q112 44 100 44 Q86 44 74 56 Z"
          fill={color}
        />
      );
  }
}

function Top({ id, c }: { id: string; c: string }) {
  const d = shade(c);
  const sleeves = (len: number) => (
    <>
      <rect x={50} y={94} width={18} height={len} rx={8} fill={c} stroke={OUTLINE} />
      <rect x={132} y={94} width={18} height={len} rx={8} fill={c} stroke={OUTLINE} />
    </>
  );
  const torso = <rect x={66} y={90} width={68} height={82} rx={14} fill={c} stroke={OUTLINE} />;
  switch (id) {
    case 'tank':
      return (
        <path
          d="M76 90 L88 90 Q100 104 112 90 L124 90 L132 172 L68 172 Z"
          fill={c}
          stroke={OUTLINE}
        />
      );
    case 'tshirt':
      return (
        <>
          {sleeves(30)}
          {torso}
          <path d="M88 90 Q100 102 112 90" fill="none" stroke={d} strokeWidth={3} />
        </>
      );
    case 'flower-shirt':
      return (
        <>
          {sleeves(30)}
          {torso}
          {[
            [82, 108],
            [112, 104],
            [96, 128],
            [122, 140],
            [80, 150],
            [104, 158],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              {[0, 1, 2, 3, 4].map((k) => (
                <circle
                  key={k}
                  cx={x + 5 * Math.cos((k * 2 * Math.PI) / 5)}
                  cy={y + 5 * Math.sin((k * 2 * Math.PI) / 5)}
                  r={3.4}
                  fill="#fff7ed"
                />
              ))}
              <circle cx={x} cy={y} r={2.4} fill="#facc15" />
            </g>
          ))}
          <path d="M92 90 L100 106 L108 90" fill="#fff7ed" stroke={OUTLINE} />
        </>
      );
    case 'sweater':
      return (
        <>
          {sleeves(80)}
          {torso}
          <rect x={66} y={160} width={68} height={12} rx={4} fill={d} />
          <path
            d="M70 120 L80 112 L90 120 L100 112 L110 120 L120 112 L130 120"
            fill="none"
            stroke="#fff"
            strokeWidth={3}
          />
          <rect x={88} y={86} width={24} height={10} rx={4} fill={d} />
        </>
      );
    case 'parka':
      return (
        <>
          <rect x={46} y={92} width={24} height={84} rx={11} fill={c} stroke={OUTLINE} />
          <rect x={130} y={92} width={24} height={84} rx={11} fill={c} stroke={OUTLINE} />
          <rect x={62} y={86} width={76} height={92} rx={18} fill={c} stroke={OUTLINE} />
          {[110, 130, 150].map((y) => (
            <path
              key={y}
              d={`M64 ${y} Q100 ${y + 6} 136 ${y}`}
              fill="none"
              stroke={d}
              strokeWidth={2}
            />
          ))}
          <line x1={100} y1={92} x2={100} y2={176} stroke={d} strokeWidth={2} />
          <path
            d="M76 88 Q100 74 124 88"
            fill="none"
            stroke="#f5f5f4"
            strokeWidth={8}
            strokeLinecap="round"
          />
        </>
      );
    case 'sparkle-top':
      return (
        <>
          <path d="M72 92 L128 92 L134 172 L66 172 Z" fill={c} stroke={OUTLINE} />
          {Array.from({ length: 18 }, (_, i) => (
            <circle
              key={i}
              cx={74 + ((i * 0.618) % 1) * 52}
              cy={100 + (i / 17) * 66}
              r={2}
              fill="#fff"
              opacity={0.85}
            />
          ))}
        </>
      );
    case 'jersey':
      return (
        <>
          {sleeves(30)}
          {torso}
          <rect x={50} y={116} width={18} height={6} fill="#fff" />
          <rect x={132} y={116} width={18} height={6} fill="#fff" />
          <text
            x={100}
            y={146}
            textAnchor="middle"
            fontSize={30}
            fontWeight={800}
            fill="#fff"
            fontFamily="system-ui, sans-serif"
          >
            7
          </text>
        </>
      );
    case 'suit-top':
      return (
        <>
          <rect x={48} y={92} width={22} height={84} rx={10} fill="#f8fafc" stroke={OUTLINE} />
          <rect x={130} y={92} width={22} height={84} rx={10} fill="#f8fafc" stroke={OUTLINE} />
          <rect x={64} y={88} width={72} height={88} rx={16} fill="#f8fafc" stroke={OUTLINE} />
          <rect x={84} y={112} width={32} height={22} rx={4} fill={c} />
          <circle cx={92} cy={123} r={3} fill="#fff" />
          <circle cx={108} cy={123} r={3} fill="#fde047" />
          <rect x={48} y={150} width={22} height={6} fill={c} />
          <rect x={130} y={150} width={22} height={6} fill={c} />
        </>
      );
    default:
      return null;
  }
}

function Bottom({ id, c }: { id: string; c: string }) {
  const d = shade(c);
  const legs = (h: number, w = 24, extra = 0) => (
    <>
      <rect x={74 - extra} y={166} width={w + extra} height={h} rx={8} fill={c} stroke={OUTLINE} />
      <rect x={102} y={166} width={w + extra} height={h} rx={8} fill={c} stroke={OUTLINE} />
      <rect x={72} y={164} width={56} height={22} rx={6} fill={c} />
    </>
  );
  switch (id) {
    case 'jeans':
      return (
        <>
          {legs(96)}
          <line x1={100} y1={170} x2={100} y2={186} stroke={d} strokeWidth={2} />
          <rect x={72} y={164} width={56} height={6} fill={d} />
        </>
      );
    case 'shorts':
      return (
        <>
          {legs(38)}
          <rect x={72} y={164} width={56} height={6} fill={d} />
        </>
      );
    case 'snow-pants':
      return (
        <>
          {legs(92, 26, 2)}
          {[196, 222].map((y) => (
            <g key={y}>
              <line x1={72} y1={y} x2={98} y2={y} stroke={d} strokeWidth={2} />
              <line x1={102} y1={y} x2={128} y2={y} stroke={d} strokeWidth={2} />
            </g>
          ))}
        </>
      );
    case 'skirt':
      return (
        <>
          <path d="M72 164 L128 164 L146 214 Q100 224 54 214 Z" fill={c} stroke={OUTLINE} />
          <path
            d="M60 210 Q100 220 140 210"
            fill="none"
            stroke="#fff"
            strokeWidth={2}
            strokeDasharray="3 4"
          />
        </>
      );
    case 'track':
      return (
        <>
          {legs(96)}
          <rect x={76} y={168} width={4} height={92} fill="#fff" />
          <rect x={120} y={168} width={4} height={92} fill="#fff" />
        </>
      );
    case 'suit-pants':
      return (
        <>
          <rect x={72} y={166} width={27} height={94} rx={9} fill="#f8fafc" stroke={OUTLINE} />
          <rect x={101} y={166} width={27} height={94} rx={9} fill="#f8fafc" stroke={OUTLINE} />
          <rect x={70} y={164} width={60} height={14} rx={5} fill={c} />
          <rect x={72} y={214} width={27} height={6} fill={c} />
          <rect x={101} y={214} width={27} height={6} fill={c} />
        </>
      );
    default:
      return null;
  }
}

function Shoes({ id, c }: { id: string; c: string }) {
  const pair = (render: (x: number, flip: number) => React.ReactNode) => (
    <>
      {render(86, -1)}
      {render(114, 1)}
    </>
  );
  switch (id) {
    case 'loafers':
      return pair((x, f) => (
        <ellipse key={x} cx={x + f * 3} cy={266} rx={15} ry={8} fill={c} stroke={OUTLINE} />
      ));
    case 'flipflops':
      return pair((x, f) => (
        <g key={x}>
          <ellipse cx={x + f * 3} cy={272} rx={15} ry={4} fill={c} stroke={OUTLINE} />
          <path
            d={`M${x - 8} 270 L${x + f * 2} 262 L${x + 8} 270`}
            fill="none"
            stroke={shade(c, 0.6)}
            strokeWidth={3}
          />
        </g>
      ));
    case 'snow-boots':
      return pair((x, f) => (
        <g key={x}>
          <rect x={x - 16} y={232} width={32} height={36} rx={6} fill={c} stroke={OUTLINE} />
          <ellipse cx={x + f * 4} cy={268} rx={17} ry={7} fill={c} stroke={OUTLINE} />
          <rect x={x - 18} y={228} width={36} height={10} rx={5} fill="#f5f5f4" />
        </g>
      ));
    case 'shiny':
      return pair((x, f) => (
        <g key={x}>
          <path
            d={`M${x - 12} 268 Q${x} 256 ${x + 12} 266 L${x + 12} 272 L${x - 12} 272 Z`}
            fill={c}
            stroke={OUTLINE}
          />
          <circle cx={x + f * 6} cy={264} r={2} fill="#fff" />
        </g>
      ));
    case 'sneakers':
      return pair((x, f) => (
        <g key={x}>
          <path
            d={`M${x - f * 13} 270 Q${x - f * 13} 254 ${x} 254 Q${x + f * 18} 258 ${x + f * 18} 270 Z`}
            fill={c}
            stroke={OUTLINE}
          />
          <rect x={f > 0 ? x - 14 : x - 19} y={268} width={33} height={5} rx={2} fill="#fff" />
          <line x1={x - 4} y1={258} x2={x + 4} y2={262} stroke="#fff" strokeWidth={2} />
        </g>
      ));
    case 'moon-boots':
      return pair((x) => (
        <g key={x}>
          <rect x={x - 17} y={236} width={34} height={38} rx={12} fill="#e2e8f0" stroke={OUTLINE} />
          <rect x={x - 17} y={262} width={34} height={12} rx={5} fill={c} />
        </g>
      ));
    default:
      return null;
  }
}

function Hat({ id, c }: { id: string; c: string }) {
  const d = shade(c);
  switch (id) {
    case 'sunhat':
      return (
        <>
          <ellipse cx={100} cy={40} rx={50} ry={11} fill={c} stroke={OUTLINE} />
          <path d="M78 40 Q78 14 100 14 Q122 14 122 40 Z" fill={c} stroke={OUTLINE} />
          <rect x={78} y={32} width={44} height={6} fill={d} />
        </>
      );
    case 'beanie':
      return (
        <>
          <path d="M72 50 Q72 18 100 18 Q128 18 128 50 Z" fill={c} stroke={OUTLINE} />
          <rect x={70} y={44} width={60} height={10} rx={4} fill={d} />
          <circle cx={100} cy={16} r={8} fill="#f5f5f4" />
        </>
      );
    case 'party-hat':
      return (
        <>
          <path d="M84 38 L100 -4 L116 38 Z" fill={c} stroke={OUTLINE} />
          <path d="M89 26 L111 26 M94 14 L106 14" stroke="#fff" strokeWidth={3} />
          <circle cx={100} cy={-4} r={5} fill="#facc15" />
        </>
      );
    case 'crown':
      return (
        <>
          <path
            d="M78 38 L78 14 L89 26 L100 8 L111 26 L122 14 L122 38 Z"
            fill="#facc15"
            stroke={OUTLINE}
          />
          {[86, 100, 114].map((x) => (
            <circle key={x} cx={x} cy={31} r={3.5} fill={c} />
          ))}
        </>
      );
    case 'cap':
      return (
        <>
          <path d="M74 44 Q74 20 100 20 Q126 20 126 44 Z" fill={c} stroke={OUTLINE} />
          <path d="M108 42 Q140 38 150 46 L108 48 Z" fill={d} stroke={OUTLINE} />
          <circle cx={100} cy={20} r={3} fill={d} />
        </>
      );
    case 'helmet':
      return (
        <>
          <circle
            cx={100}
            cy={56}
            r={40}
            fill="rgba(186,230,253,0.28)"
            stroke="#e2e8f0"
            strokeWidth={6}
          />
          <path
            d="M76 36 Q86 24 100 22"
            fill="none"
            stroke="#fff"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.8}
          />
          <rect x={74} y={90} width={52} height={10} rx={4} fill={c} />
        </>
      );
    default:
      return null;
  }
}

function ExtraBack({ id, c }: { id: string; c: string }) {
  if (id === 'jetpack')
    return (
      <>
        <rect x={52} y={96} width={22} height={58} rx={9} fill="#94a3b8" stroke={OUTLINE} />
        <rect x={126} y={96} width={22} height={58} rx={9} fill="#94a3b8" stroke={OUTLINE} />
        <path d="M56 154 L63 178 L70 154 Z M130 154 L137 178 L144 154 Z" fill={c} />
      </>
    );
  if (id === 'backpack')
    return <rect x={58} y={96} width={84} height={70} rx={14} fill={shade(c)} stroke={OUTLINE} />;
  return null;
}

function ExtraFront({ id, c }: { id: string; c: string }) {
  switch (id) {
    case 'shades':
      return (
        <>
          <rect
            x={80}
            y={50}
            width={18}
            height={11}
            rx={4}
            fill={c}
            stroke="#0f172a"
            strokeWidth={2}
          />
          <rect
            x={102}
            y={50}
            width={18}
            height={11}
            rx={4}
            fill={c}
            stroke="#0f172a"
            strokeWidth={2}
          />
          <line x1={98} y1={54} x2={102} y2={54} stroke="#0f172a" strokeWidth={2} />
          <rect x={82} y={52} width={6} height={3} rx={1} fill="rgba(255,255,255,0.6)" />
        </>
      );
    case 'scarf':
      return (
        <>
          <rect x={78} y={82} width={44} height={14} rx={7} fill={c} stroke={OUTLINE} />
          <rect x={108} y={88} width={12} height={40} rx={4} fill={c} stroke={OUTLINE} />
          <path d="M108 120 L120 120 M108 112 L120 112" stroke={shade(c)} strokeWidth={2} />
        </>
      );
    case 'bowtie':
      return (
        <>
          <path d="M100 92 L84 84 L84 100 Z M100 92 L116 84 L116 100 Z" fill={c} stroke={OUTLINE} />
          <circle cx={100} cy={92} r={4} fill={shade(c)} />
        </>
      );
    case 'medal':
      return (
        <>
          <path d="M86 88 L100 132 L114 88" fill="none" stroke={c} strokeWidth={6} />
          <circle cx={100} cy={138} r={11} fill="#facc15" stroke="#b45309" strokeWidth={2} />
          <text
            x={100}
            y={143}
            textAnchor="middle"
            fontSize={12}
            fontWeight={800}
            fill="#b45309"
            fontFamily="system-ui, sans-serif"
          >
            1
          </text>
        </>
      );
    case 'backpack':
      return (
        <>
          <path d="M72 94 Q78 130 74 168" fill="none" stroke={c} strokeWidth={6} />
          <path d="M128 94 Q122 130 126 168" fill="none" stroke={c} strokeWidth={6} />
        </>
      );
    default:
      return null;
  }
}

/** The dress-up character, drawn in layers from back to front. */
export function Figure({ look, theme, label }: { look: Look; theme: Theme | null; label: string }) {
  const skin = SKINS[look.skin];
  const hair = HAIR_COLORS[look.hairColor];
  const col = (slot: keyof Look['colors']) => COLOR_HEX[look.colors[slot]];
  const bg = theme ? THEMES[theme] : { sky: '#e0e7ff', ground: '#c7d2fe' };
  return (
    <svg
      viewBox="0 -12 200 300"
      role="img"
      aria-label={label}
      style={{ width: '100%', maxWidth: 300, display: 'block', borderRadius: 16 }}
    >
      <rect x={0} y={-12} width={200} height={300} fill={bg.sky} />
      <rect x={0} y={232} width={200} height={56} fill={bg.ground} />
      {theme === 'space' &&
        [
          [20, 10],
          [160, 30],
          [40, 120],
          [180, 160],
          [30, 200],
          [150, 90],
        ].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={1.6} fill="#fff" />)}
      {theme === 'snow' &&
        [
          [24, 30],
          [170, 50],
          [40, 150],
          [176, 180],
          [150, 10],
          [20, 90],
        ].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={3} fill="#fff" />)}
      {theme === 'beach' && <circle cx={168} cy={22} r={16} fill="#fde047" />}
      {theme === 'party' &&
        [
          [20, 20, '#f472b6'],
          [176, 40, '#facc15'],
          [30, 140, '#34d399'],
          [170, 150, '#60a5fa'],
        ].map(([x, y, f]) => (
          <rect
            key={`${x}${y}`}
            x={x as number}
            y={y as number}
            width={6}
            height={6}
            fill={f as string}
            transform={`rotate(30 ${x} ${y})`}
          />
        ))}
      <ellipse cx={100} cy={276} rx={50} ry={7} fill="rgba(0,0,0,0.18)" />

      <ExtraBack id={look.items.extra} c={col('extra')} />
      <Hair style={look.hair} color={hair} back />
      {/* body */}
      <rect x={52} y={94} width={14} height={80} rx={7} fill={skin} />
      <rect x={134} y={94} width={14} height={80} rx={7} fill={skin} />
      <circle cx={59} cy={176} r={8} fill={skin} />
      <circle cx={141} cy={176} r={8} fill={skin} />
      <rect x={78} y={166} width={18} height={100} rx={8} fill={skin} />
      <rect x={104} y={166} width={18} height={100} rx={8} fill={skin} />
      <rect x={92} y={78} width={16} height={16} fill={skin} />
      <rect x={70} y={90} width={60} height={80} rx={14} fill={shade(skin, 0.95)} />
      <Bottom id={look.items.bottom} c={col('bottom')} />
      <Shoes id={look.items.shoes} c={col('shoes')} />
      <Top id={look.items.top} c={col('top')} />
      {/* head */}
      <circle cx={100} cy={56} r={26} fill={skin} />
      <circle cx={74} cy={58} r={5} fill={skin} />
      <circle cx={126} cy={58} r={5} fill={skin} />
      <circle cx={90} cy={55} r={3} fill="#1e293b" />
      <circle cx={110} cy={55} r={3} fill="#1e293b" />
      <circle cx={84} cy={66} r={4} fill="#fb7185" opacity={0.35} />
      <circle cx={116} cy={66} r={4} fill="#fb7185" opacity={0.35} />
      <path
        d="M91 68 Q100 76 109 68"
        fill="none"
        stroke="#7f1d1d"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Hair style={look.hair} color={hair} back={false} />
      <ExtraFront id={look.items.extra} c={col('extra')} />
      <Hat id={look.items.hat} c={col('hat')} />
    </svg>
  );
}
