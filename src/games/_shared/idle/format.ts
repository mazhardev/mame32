const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** 1234 → "1,234"; 1.5e6 → "1.50M"; very large numbers fall back to exponent form. */
export function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v < 1000)
    return (
      sign + (v < 10 && !Number.isInteger(v) ? v.toFixed(1) : Math.floor(v).toLocaleString('en-US'))
    );
  if (v < 1e6) return sign + Math.floor(v).toLocaleString('en-US');
  const tier = Math.floor(Math.log10(v) / 3);
  if (tier < UNITS.length) return sign + (v / 10 ** (tier * 3)).toFixed(digits) + UNITS[tier];
  return sign + v.toExponential(digits);
}

/** Seconds → "1h 05m", "4m 09s", "12s". */
export function formatDuration(s: number): string {
  const sec = Math.max(0, Math.floor(s));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec % 60).padStart(2, '0')}s`;
  return `${sec}s`;
}

/** Total price of buying `n` more of something whose price grows by `growth` each time. */
export function bulkCost(base: number, growth: number, owned: number, n: number): number {
  if (n <= 0) return 0;
  return (base * growth ** owned * (growth ** n - 1)) / (growth - 1);
}

/** How many can be afforded with `budget` (at least 0). */
export function maxAffordable(base: number, growth: number, owned: number, budget: number): number {
  const first = base * growth ** owned;
  if (budget < first) return 0;
  return Math.floor(Math.log((budget * (growth - 1)) / first + 1) / Math.log(growth));
}
