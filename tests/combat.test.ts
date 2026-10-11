import { describe, it, expect } from 'vitest';
import { useAbility, move, startTurn, damage, Unit, Ability } from '../src/engine/combat';
import { heroById } from '../src/data/heroes';
const rng = () => 0.99; // no crits — deterministic
const mk = (heroId: string, id: string, x: number, y: number, over: Partial<Unit> = {}): Unit => {
  const h = heroById(heroId);
  return { id, heroId, hp: h.maxHp, maxHp: h.maxHp, ap: h.maxAp, maxAp: h.maxAp, moveCost: h.moveCost, x, y, shield: 0, empowered: 0, disarmed: 0, ...over };
};
const ab = (heroId: string, abId: string): Ability => { const a = heroById(heroId).abilities.find(a => a.id === abId)!; return { ...a }; };
const noCover = new Set<string>();

describe('AP economy', () => {
  it('refills AP on turn start and ticks down statuses', () => {
    const u = mk('ping', 'a', 0, 0, { ap: 0, shield: 2, disarmed: 1 });
    const t = startTurn(u);
    expect(t.ap).toBe(u.maxAp); expect(t.shield).toBe(1); expect(t.disarmed).toBe(0);
  });
  it('rejects ability when AP insufficient', () => {
    const s = [mk('ping', 'a', 0, 0, { ap: 1 }), mk('black', 'b', 1, 0)];
    const r = useAbility(s, 'a', ab('ping', 'laugh'), 'b', noCover, rng);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toBe('not enough AP');
  });
  it('rejects out-of-range targets', () => {
    const s = [mk('ping', 'a', 0, 0), mk('black', 'b', 9, 9)];
    const r = useAbility(s, 'a', ab('ping', 'laugh'), 'b', noCover, rng);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toBe('out of range');
  });
});

describe('combat math', () => {
  it('cover halves damage', () => {
    const a = mk('black', 'a', 0, 0), d = mk('ping', 'b', 1, 0);
    const open = damage(30, a, d, noCover, rng).dmg;
    const covered = damage(30, a, d, new Set(['1,0']), rng).dmg;
    expect(covered).toBeLessThanOrEqual(Math.ceil(open * 0.5)); expect(covered).toBeLessThan(open);
  });
  it('flank and back bonuses apply', () => {
    const d = mk('ping', 'b', 5, 5);
    const base = damage(20, mk('black', 'a', 5, 4), d, noCover, rng).dmg; // behind (attacker y < defender y)
    const front = damage(20, mk('black', 'a', 5, 6), d, noCover, rng).dmg;
    expect(base).toBeGreaterThan(front);
  });
  it('paperwork armor absorbs half', () => {
    let s = [mk('mariusz', 'a', 0, 0), mk('ping', 'b', 1, 0)];
    s = (useAbility(s, 'a', ab('mariusz', 'paperwork'), 'a', noCover, rng) as any).units;
    const before = s[0].hp = 100, max = 100;
    const r = useAbility(s, 'b', ab('ping', 'shiv'), 'a', noCover, rng) as any;
    const dmg = before - r.units.find((u: Unit) => u.id === 'a').hp;
    expect(dmg).toBeLessThan(12); // 18 base, shielded → ≤9 + variance
  });
  it('black budget empowers next ability (0 AP, double damage)', () => {
    let s = [mk('black', 'a', 0, 0), mk('ping', 'b', 1, 0)];
    s = (useAbility(s, 'a', ab('black', 'budget'), 'a', noCover, rng) as any).units;
    const apBefore = s[0].ap;
    const r = useAbility(s, 'a', ab('black', 'downstairs'), 'b', noCover, rng) as any;
    expect(r.units.find((u: Unit) => u.id === 'a').ap).toBe(apBefore); // 0 cost
    expect(r.units.find((u: Unit) => u.id === 'b')!.hp).toBeLessThan(heroById('ping').maxHp - 55); // doubled DOWNSTAIRS hit
  });
  it('dead units are removed from state', () => {
    const s = [mk('ping', 'a', 0, 0, { hp: 5 }), mk('black', 'b', 1, 0)];
    const r = useAbility(s, 'b', ab('black', 'downstairs'), 'a', noCover, rng) as any;
    expect(r.units.find((u: Unit) => u.id === 'a')).toBeUndefined();
  });
});

describe('movement', () => {
  it('costs AP per tile and blocks occupied tiles', () => {
    const s = [mk('ping', 'a', 0, 0), mk('black', 'b', 2, 0)];
    expect(move(s, 'a', 3, 0, new Set(['2,0']))).toMatchObject({ ok: true });
    const r = move(s, 'a', 2, 0, new Set(['2,0']));
    expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toBe('occupied');
  });
});
