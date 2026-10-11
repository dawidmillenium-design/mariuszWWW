// AP turn-based combat core — pure functions, deterministic via injected RNG. Fully unit-tested.
export interface Unit {
  id: string; heroId: string; hp: number; maxHp: number;
  ap: number; maxAp: number; moveCost: number;
  x: number; y: number; shield: number; empowered: number; disarmed: number;
}
export interface Ability { id: string; apCost: number; power: number; range: number; aoe?: number; kind: string; }
export type RNG = () => number; // Math.random or seeded for tests

export const dist = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.abs(a.x-b.x) + Math.abs(a.y-b.y);

export function startTurn(u: Unit): Unit {
  return { ...u, ap: u.maxAp, shield: Math.max(0, u.shield - 1), empowered: Math.max(0, u.empowered - 1), disarmed: Math.max(0, u.disarmed - 1) };
}

/** Grid tactics: +25% attacking from behind (higher y), +15% from flank, cover halves damage when defender on 'cover' tiles. */
export function damage(base: number, attacker: Unit, defender: Unit, coverTiles: Set<string>, rng: RNG): { dmg: number; crit: boolean } {
  let mult = 1;
  if (attacker.y < defender.y) mult += 0.25;      // behind
  else if (attacker.x !== defender.x) mult += 0.15; // flank
  if (coverTiles.has(defender.x + ',' + defender.y)) mult *= 0.5;
  const crit = rng() < 0.12;
  if (crit) mult *= 1.5;
  const dmg = Math.max(1, Math.round(base * mult));
  return { dmg, crit };
}

export type Result = { ok: true; units: Unit[]; log: string[] } | { ok: false; reason: string };

export function useAbility(state: Unit[], casterId: string, ability: Ability, targetId: string, cover: Set<string>, rng: RNG): Result {
  const c = state.find(u => u.id === casterId); if (!c) return { ok: false, reason: 'no caster' };
  const t = state.find(u => u.id === targetId); if (!t) return { ok: false, reason: 'no target' };
  if (c.disarmed > 0) return { ok: false, reason: 'disarmed' };
  if (dist(c, t) > ability.range) return { ok: false, reason: 'out of range' };
  const empowered = c.empowered > 0 && ability.id !== 'budget'; // Black Budget: next ability free + double
  const cost = c.empowered > 0 ? 0 : ability.apCost;
  if (c.ap < cost) return { ok: false, reason: 'not enough AP' };
  const log: string[] = [];
  let units = state.map(u => ({ ...u }));
  const ci = units.findIndex(u => u.id === casterId);
  units[ci] = { ...units[ci], ap: units[ci].ap - cost, empowered: ability.id === 'budget' ? 1 : (empowered ? 0 : units[ci].empowered) };
  if (ability.kind === 'tech') {
    if (ability.id === 'paperwork') units[ci] = { ...units[ci], shield: 2 };
    if (ability.id === 'budget') units[ci] = { ...units[ci], empowered: 1 };
    if (ability.id === 'decoy') { const f = units.find(u => u.id !== casterId); if (f) f.disarmed = 1; }
    log.push(units[ci].heroId + ' uses ' + ability.id);
    return { ok: true, units, log };
  }
  const pow = empowered ? ability.power * 2 : ability.power;
  const targets = ability.aoe ? units.filter(u => dist(u, t) <= ability.aoe! && u.id !== casterId) : [t];
  targets.forEach(u => {
    const { dmg, crit } = damage(pow, units[ci], u, cover, rng);
    const absorbed = Math.min(u.shield > 0 ? Math.ceil(dmg / 2) : 0, dmg);
    const final = dmg - absorbed;
    const i = units.findIndex(x => x.id === u.id);
    units[i] = { ...units[i], hp: Math.max(0, units[i].hp - final) };
    log.push((crit ? 'CRIT ' : '') + ability.id + ' → ' + u.heroId + ' for ' + final + (absorbed ? ' (' + absorbed + ' shielded)' : ''));
  });
  units = units.filter(u => u.hp > 0);
  return { ok: true, units, log };
}

export function move(state: Unit[], id: string, x: number, y: number, occupied: Set<string>, maxX = 12, maxY = 8): Result {
  const u = state.find(v => v.id === id); if (!u) return { ok: false, reason: 'no unit' };
  const d = dist(u, { x, y });
  const cost = d * u.moveCost;
  if (u.ap < cost) return { ok: false, reason: 'not enough AP' };
  if (x < 0 || y < 0 || x > maxX || y > maxY) return { ok: false, reason: 'off grid' };
  if (occupied.has(x + ',' + y)) return { ok: false, reason: 'occupied' };
  const units = state.map(v => v.id === id ? { ...v, x, y, ap: v.ap - cost } : { ...v });
  return { ok: true, units, log: [u.heroId + ' moves to ' + x + ',' + y + ' (-' + cost + ' AP)'] };
}
