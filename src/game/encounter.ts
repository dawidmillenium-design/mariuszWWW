// Map combat encounters — Task Force ambushes, resolved on the Phase-2 AP combat core.
// Squad-level: your operator + crew vs a heat-scaled Task Force team. Deterministic via injected RNG.
import { Unit, Ability, RNG, useAbility, move, startTurn, dist } from '../engine/combat';
import type { HeroId } from './director';

export const ATTACK_MELEE: Ability  = { id: 'attack', apCost: 1, power: 10, range: 1, kind: 'strike' };
export const ATTACK_RANGED: Ability = { id: 'shot',   apCost: 2, power: 12, range: 3, kind: 'strike' };

const CREW_NAMES: Record<HeroId, string> = { ping: 'Extraction Crew', mariusz: 'Fleet Security', black: 'Downstairs Detail' };
const mk = (id: string, heroId: string, hp: number, ap: number, moveCost: number, x: number, y: number): Unit =>
  ({ id, heroId, hp, maxHp: hp, ap, maxAp: ap, moveCost, x, y, shield: 0, empowered: 0, disarmed: 0 });

/** Hero squad: operator (canon stats) + two crew units. */
export function heroSquad(heroId: HeroId): Unit[] {
  const H: Record<HeroId, { hp: number; ap: number }> = { ping: { hp: 90, ap: 5 }, mariusz: { hp: 130, ap: 4 }, black: { hp: 160, ap: 3 } };
  const h = H[heroId];
  return [ mk(heroId, heroId, h.hp, h.ap, 1, 1, 3),
           mk('crew1', CREW_NAMES[heroId], 50, 4, 1, 0, 4), mk('crew2', CREW_NAMES[heroId], 50, 4, 1, 2, 4) ];
}
/** Task Force squad scales with Heat: more agents, tougher agents, better guns. */
export function taskForceSquad(heat: number, rng: RNG): Unit[] {
  const count = Math.min(4, 2 + Math.floor(heat / 40));
  const squad: Unit[] = [];
  for (let i = 0; i < count; i++) {
    const hp = Math.min(120, Math.round(40 + heat * 0.6));
    squad.push(mk('tf' + i, 'Task Force', hp, 3, 1, 9, 2 + i));
  }
  return squad;
}
export type Policy = 'aggressive' | 'defensive';
export interface BattleResult { winner: 'heroes' | 'taskforce' | 'draw'; rounds: number; log: string[] }

const nearest = (u: Unit, foes: Unit[]) => foes.reduce((a, b) => dist(u, a) <= dist(u, b) ? a : b);
const isHero = (u: Unit) => !u.heroId.includes('Task Force');

/** Auto-battle both sides. Aggressive closes distance and swings; defensive holds cover and fires only in range. */
export function autoBattle(heroes: Unit[], foes: Unit[], cover: Set<string>, rng: RNG, policy: Policy, maxRounds = 20): BattleResult {
  let units: Unit[] = [...heroes, ...foes];
  const log: string[] = ['AMBUSH — Task Force team on the wire.'];
  let round = 0;
  while (round < maxRounds) {
    round++;
    units = units.map(u => startTurn(u));
    for (const id of units.map(u => u.id)) {
      let me = units.find(u => u.id === id); if (!me || me.hp <= 0) continue;
      const foesAlive = units.filter(u => u.hp > 0 && isHero(u) !== isHero(me)); if (!foesAlive.length) break;
      const ranged = me.heroId === 'Task Force' ? true : false; // heroes field mixed crew; melee default
      const atk: Ability = ranged ? ATTACK_RANGED : ATTACK_MELEE;
      let guard = 0;
      while (me.ap > 0 && guard++ < 6) {
        const target = nearest(me, units.filter(u => u.hp > 0 && isHero(u) !== isHero(me)));
        const d = dist(me, target);
        if (d <= atk.range && me.ap >= atk.apCost) {
          const r = useAbility(units, me.id, atk, target.id, cover, rng);
          if (r.ok) { units = r.units; log.push(r.log.join(' / ')); }
          me = units.find(u => u.id === id)!;
          if (units.filter(u => u.hp > 0 && isHero(u) !== isHero(me)).length === 0) break;
        } else if (me.ap >= me.moveCost && (policy === 'aggressive' || !cover.has(me.x + ',' + me.y) || d > atk.range)) {
          const step = { x: me.x + Math.sign(target.x - me.x), y: me.y + Math.sign(target.y - me.y) };
          const occ = new Set(units.filter(u => u.hp > 0 && u.id !== me.id).map(u => u.x + ',' + u.y));
          const r = move(units, me.id, step.x, step.y, occ);
          if (r.ok) { units = (r as any).units; me = units.find(u => u.id === id)!; }
          else break;
        } else break;
      }
    }
    const hAlive = units.some(u => u.hp > 0 && isHero(u));
    const tAlive = units.some(u => u.hp > 0 && !isHero(u));
    if (!hAlive || !tAlive) break;
  }
  const hAlive = units.some(u => u.hp > 0 && isHero(u));
  const tAlive = units.some(u => u.hp > 0 && !isHero(u));
  const winner = hAlive && !tAlive ? 'heroes' : !hAlive && tAlive ? 'taskforce' : 'draw';
  log.push('BATTLE END — ' + winner.toUpperCase() + ' after ' + round + ' rounds.');
  return { winner, rounds: round, log };
}
