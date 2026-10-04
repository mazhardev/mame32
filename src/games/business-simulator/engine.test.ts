import { describe, expect, it } from 'vitest';
import {
  HIRE,
  QUARTERS,
  TUNING,
  borrow,
  botQuarter,
  canLaunch,
  endQuarter,
  hire,
  launch,
  newCompany,
  payroll,
  projectQuality,
  repay,
  rivalQuality,
  share,
  validCompany,
  valuation,
} from './engine';

describe('business simulator', () => {
  it('a project must reach its minimum before launch, and polishing raises quality', () => {
    const c = newCompany(1, 'normal');
    expect(canLaunch(c)).toBe(false);
    expect(launch(c, 'standard')).toBeNull();
    c.project!.points = c.project!.needed;
    const q1 = projectQuality(c);
    c.project!.points += 20;
    expect(projectQuality(c)).toBeGreaterThan(q1);
    const p = launch(c, 'standard')!;
    expect(p.quality).toBe(q1 + 9);
    expect(c.products).toHaveLength(1);
    expect(c.project!.points).toBe(0);
    expect(c.project!.needed).toBeGreaterThan(30);
  });

  it('better products, cheaper prices and fresher products win more of the market', () => {
    const c = newCompany(1, 'normal');
    const rival = rivalQuality(3, 'normal');
    const base = { id: 1, name: 'X', quality: rival, tier: 'standard' as const, age: 0, sold: 0 };
    expect(share(c, { ...base, quality: rival + 20 }, rival)).toBeGreaterThan(
      share(c, base, rival),
    );
    expect(share(c, { ...base, tier: 'budget' }, rival)).toBeGreaterThan(share(c, base, rival));
    expect(share(c, { ...base, age: 4 }, rival)).toBeLessThan(share(c, base, rival));
    c.staff.support = 3;
    const supported = share(c, { ...base, age: 4 }, rival);
    c.staff.support = 0;
    expect(supported).toBeGreaterThan(share(c, { ...base, age: 4 }, rival));
  });

  it('hiring costs a fee, staff cost salaries, loans are capped and repayable', () => {
    const c = newCompany(1, 'normal');
    const cash = c.cash;
    expect(hire(c, 'sales', 1)).toBe(true);
    expect(c.cash).toBe(cash - HIRE);
    expect(payroll(c)).toBe(4 * 20);
    expect(borrow(c, 600)).toBe(true);
    expect(borrow(c, 50)).toBe(false);
    expect(repay(c, 100)).toBe(true);
    expect(c.loan).toBe(500);
  });

  it('a quarter without products just burns cash; the bank covers shortfalls', () => {
    const c = newCompany(1, 'normal');
    const r = endQuarter(c, 'normal');
    expect(r.revenue).toBe(0);
    expect(r.profit).toBeLessThan(0);
    c.cash = 5;
    c.staff.engineers = 12;
    endQuarter(c, 'normal');
    expect(c.loan).toBeGreaterThan(0);
    expect(c.cash).toBeGreaterThanOrEqual(0);
  });

  it('saves round-trip through the validator', () => {
    const c = newCompany(2, 'easy');
    expect(validCompany(JSON.parse(JSON.stringify(c)))).toBe(true);
    expect(validCompany({ ...c, marketing: 9 })).toBe(false);
  });

  it('a steady CEO beats the target on easy and normal, and usually on hard', () => {
    for (const d of ['easy', 'normal'] as const)
      for (let seed = 1; seed <= 8; seed++) {
        const c = newCompany(seed, d);
        while (!c.over) botQuarter(c, d);
        expect(c.over, `${d} ${seed}`).toBe('won');
        expect(c.quarter).toBe(QUARTERS + 1);
        expect(valuation(c)).toBeGreaterThanOrEqual(TUNING[d].goal);
      }
    let wins = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const c = newCompany(seed, 'hard');
      while (!c.over) botQuarter(c, 'hard');
      if (c.over === 'won') wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(5);
  });

  it('a company that never launches does not reach the target', () => {
    const c = newCompany(1, 'easy');
    while (!c.over) endQuarter(c, 'easy');
    expect(c.over).not.toBe('won');
  });
});
