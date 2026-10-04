import {
  affordable,
  buy,
  buyUpgrade,
  click,
  newClicker,
  prestigeAvailable,
  prestigeReset,
  price,
  producerVisible,
  rate,
  tick,
  upgradeVisible,
} from './clicker';
import type { ClickerCfg, ClickerState } from './clicker';

/** A sensible player: clicks 3×/s and buys whatever pays back fastest. */
export function minutesToGoal(
  cfg: ClickerCfg,
  clicksPerSecond = 3,
  limit = 4 * 3600,
  prestige = false,
): number {
  const s: ClickerState = newClicker(cfg);
  for (let t = 0; t < limit; t++) {
    // Reset once a reset would at least double the bonus.
    if (prestige && prestigeAvailable(cfg, s) >= Math.max(3, s.prestige * 2)) prestigeReset(cfg, s);
    for (let c = 0; c < clicksPerSecond; c++) click(cfg, s);
    tick(cfg, s, 1);
    if (s.total >= cfg.goal) return t / 60;
    for (const u of cfg.upgrades)
      if (upgradeVisible(s, u) && u.cost < s.amount * 0.5) buyUpgrade(cfg, s, u.id);
    for (let k = 0; k < 20; k++) {
      let best: { id: string; value: number } | null = null;
      cfg.producers.forEach((p, i) => {
        if (!producerVisible(cfg, s, i)) return;
        const before = rate(cfg, s);
        s.owned[p.id] += 1;
        const gain = rate(cfg, s) - before;
        s.owned[p.id] -= 1;
        const value = price(cfg, s, p.id, 1) / Math.max(1e-9, gain);
        if (!best || value < best.value) best = { id: p.id, value };
      });
      const pick = best as { id: string; value: number } | null;
      if (!pick || affordable(cfg, s, pick.id) === 0) break;
      buy(cfg, s, pick.id, 1);
    }
  }
  return Infinity;
}
