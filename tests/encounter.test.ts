import { describe, it, expect } from 'vitest';
import { heroSquad, taskForceSquad, autoBattle } from '../src/game/encounter';
const lcg = (seed: number) => { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; };
const cover = new Set(['4,1', '7,5', '2,6']);
describe('combat encounters', () => {
  it('is deterministic for a fixed seed', () => {
    const a = autoBattle(heroSquad('ping'), taskForceSquad(30, lcg(7)), cover, lcg(1), 'aggressive');
    const b = autoBattle(heroSquad('ping'), taskForceSquad(30, lcg(7)), cover, lcg(1), 'aggressive');
    expect(a.winner).toBe(b.winner); expect(a.rounds).toBe(b.rounds);
  });
  it('heroes are favored at low heat', () => {
    let wins = 0;
    for (let s = 1; s <= 10; s++) if (autoBattle(heroSquad('black'), taskForceSquad(10, lcg(s)), cover, lcg(s + 100), 'aggressive').winner === 'heroes') wins++;
    expect(wins).toBeGreaterThanOrEqual(7);
  });
  it('heat 95 punishes defensive play', () => {
    let nonHero = 0;
    for (let s = 1; s <= 10; s++) if (autoBattle(heroSquad('ping'), taskForceSquad(95, lcg(s)), cover, lcg(s + 200), 'defensive').winner !== 'heroes') nonHero++;
    expect(nonHero).toBeGreaterThanOrEqual(6);
  });
  it('task force scales 2/3/4 agents with heat, hp rises', () => {
    expect(taskForceSquad(10, lcg(1))).toHaveLength(2);
    expect(taskForceSquad(50, lcg(1))).toHaveLength(3);
    expect(taskForceSquad(95, lcg(1))).toHaveLength(4);
    expect(taskForceSquad(95, lcg(1))[0].hp).toBeGreaterThan(taskForceSquad(10, lcg(1))[0].hp);
  });
});
