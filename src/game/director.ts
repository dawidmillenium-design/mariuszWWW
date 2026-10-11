// GameDirector — the core loop: travel → node action → field event → raid check → dual clocks.
// Pure orchestration over the store; inject RNG for deterministic tests.
import { createStore, gameReducer, initialState, GameState, Store, Action } from '../store/gameStore';
import { NODES, neighbors, nodeById, GameEvent, EVENT_POOL } from './world';
import { OPS_ABILITIES } from './abilities';
import { heroSquad, taskForceSquad, autoBattle, Policy } from './encounter';

export type RNG = () => number;
export type HeroId = 'ping' | 'mariusz' | 'black';
export type Ending = 'concrete-dawn' | 'berth-44' | null;

export interface TurnResult {
  logs: string[];
  event?: GameEvent;
  raid?: boolean;
  battle?: boolean;
  ending?: Ending;
  traveled?: { from: string; to: string };
}
const clamp = (v: number) => Math.max(0, Math.min(100, v));

export class Director {
  store: Store<GameState>;
  private shields = { decoy: 0, armor: 0, suppress: 0, ghost: 0, double: 0 };
  cds: Record<string, number> = {};
  pendingEvent: GameEvent | null = null;
  pendingRaid = false;
  pendingBattle = false;
  ending: Ending = null;

  constructor(public heroId: HeroId, private rng: RNG = Math.random) {
    this.store = createStore<GameState>(gameReducer, initialState);
    // hero home nodes
    const home = { ping: 'bangkok', mariusz: 'bialy', black: 'rio' }[heroId];
    this.store.dispatch({ type: 'TRAVEL', payload: home });
  }
  get s(): GameState { return this.store.getState(); }
  get node() { return nodeById(this.s.node); }

  // ---- hero passives (economy identity from the scenario) ----
  private get extractMult() { return this.heroId === 'black' ? 1.5 : 1; }
  private get extractFlat() { return this.heroId === 'ping' ? 12 : 0; }
  private get transitMult() { return this.heroId === 'mariusz' ? 1.5 : 1; }
  private get launderMult() { return this.heroId === 'black' ? 1.25 : 1; }

  canTravel(id: string): boolean { return !this.ending && !this.pendingEvent && !this.pendingRaid && !this.pendingBattle && neighbors(this.s.node).includes(id); }

  travel(id: string): TurnResult {
    const logs: string[] = [];
    if (!this.canTravel(id)) { logs.push('Cannot travel to ' + id + '.'); return { logs }; }
    const from = this.s.node;
    this.store.dispatch({ type: 'TRAVEL', payload: id });
    const n = this.node;
    logs.push('→ ' + n.name + ' — ' + n.desc);
    this.nodeAction(n.type, logs);
    const ending = this.checkEnding();
    if (ending) return { logs, ending, traveled: { from, to: id } };
    this.endTurn(logs);
    const result: TurnResult = { logs, traveled: { from, to: id } };
    if (this.pendingEvent) result.event = this.pendingEvent;
    if (this.pendingRaid) result.raid = true;
    if (this.pendingBattle) result.battle = true;
    const e2 = this.checkEnding(); if (e2) result.ending = e2;
    return result;
  }

  private nodeAction(type: string, logs: string[]) {
    const st = this.s, dbl = this.shields.double > 0 ? 2 : 1;
    if (this.shields.double > 0) this.shields.double--;
    switch (type) {
      case 'extract': {
        const gain = (Math.round((22 + this.rng() * 10) * this.extractMult) + this.extractFlat) * dbl;
        this.store.dispatch({ type: 'POWDER', payload: gain });
        logs.push('EXTRACT: +' + gain + ' Powder. The compound glows when radar sweeps.');
        break; }
      case 'transit': {
        if (st.powder < 20) { logs.push('TRANSIT: no cargo — need 20 Powder.'); break; }
        const amt = Math.min(st.powder, 30);
        const conv = Math.round(amt * 1.05 * this.transitMult * (st.rep.sov >= 60 ? 1.25 : 1)) * dbl;
        this.store.dispatch({ type: 'POWDER', payload: -amt });
        this.store.dispatch({ type: 'CLEAN', payload: conv });
        logs.push('TRANSIT: ' + amt + ' Powder → $' + conv + ' clean. Ghost vehicles, Baltic shells.');
        break; }
      case 'launder': {
        if (st.powder < 10) { logs.push('LAUNDER: nothing to wash.'); break; }
        const amt = Math.min(st.powder, 60);
        const conv = Math.round(amt * 1.0 * this.launderMult) * dbl;
        this.store.dispatch({ type: 'POWDER', payload: -amt });
        this.store.dispatch({ type: 'CLEAN', payload: conv });
        this.store.dispatch({ type: 'HEAT', payload: -Math.round(5 * (this.heroId === 'ping' ? 1.4 : 1)) });
        logs.push('LAUNDER: +$' + conv + ' clean, Heat -' + Math.round(5 * (this.heroId === 'ping' ? 1.4 : 1)) + '.');
        break; }
      case 'dig': {
        const cost = Math.round(40 * (st.rep.sov >= 60 ? 0.8 : 1));
        if (st.clean < cost) { logs.push('DIG: drill idle — needs $' + cost + ' clean funds.'); break; }
        const prog = Math.round((6 + this.rng() * 3)) * dbl; // 6-9%: win-con must be reachable (ADR-008)
        this.store.dispatch({ type: 'CLEAN', payload: -cost });
        this.store.dispatch({ type: 'DRILL', payload: prog });
        logs.push('DIG: -$' + cost + '. Drill at ' + this.s.drill + '%. The hum gets louder.');
        break; }
    }
    // action heat (launder already applied its own cooling)
    const heatBy: Record<string, number> = { extract: 4, transit: 2, launder: 0, dig: 6 };
    let heat = heatBy[type] || 0;
    if (heat > 0) {
      if (this.shields.ghost > 0) heat = 0;
      else {
        if (this.heroId === 'mariusz') heat = Math.max(0, heat - 1);
        if (this.s.rep.dock >= 60) heat = Math.max(0, heat - 1);
      }
    }
    this.store.dispatch({ type: 'HEAT', payload: heat });
    this.store.dispatch({ type: 'MOVE_TICK' });
    this.store.dispatch({ type: 'CASE_UP', payload: this.caseGain(type === 'dig' ? 1 : 1) });
    this.store.dispatch({ type: 'COOLDOWN' });
    // field event chance
    const evChance = type === 'dig' ? 0.35 : 0.3;
    if (this.rng() < evChance) this.pendingEvent = EVENT_POOL[Math.floor(this.rng() * EVENT_POOL.length)];
  }

  private caseGain(base: number): number {
    let v = base;
    if (this.shields.suppress > 0) v = Math.ceil(v / 2);
    if (this.s.rep.jtf >= 60) v = Math.max(0, v - 1);
    return v + Math.floor(this.s.heat / 25);
  }

  private endTurn(logs: string[]) {
    Object.keys(this.cds).forEach(k => { if (this.cds[k] > 0) this.cds[k]--; });
    if (this.s.heat > 0 && this.rng() < (this.s.heat / 100) * 0.55) {
      if (this.shields.decoy > 0) { this.shields.decoy--; logs.push('RAID intercepted — they hit the decoy cache. Flour and pride.'); }
      else if (this.shields.armor > 0) { this.shields.armor--; logs.push('RAID fizzles: the container holds tractors. Only tractors.'); }
      else this.pendingRaid = true;
    }
    // ambush: battles replace the raid roll when they fire (one encounter per turn, ADR-009)
    if (!this.pendingRaid && this.s.heat > 20 && this.rng() < (this.s.heat / 100) * 0.3) {
      this.pendingBattle = true;
      logs.push('AMBUSH — Task Force team on the wire at ' + nodeById(this.s.node).name + '!');
    }
    if (this.s.heat >= 85 && this.rng() < 0.5) {
      this.store.dispatch({ type: 'CASE_UP', payload: 4 });
      logs.push('Red notice drafted. Kenji\u2019s evidence wall grows a string. Case +4.');
    }
    // shields tick down only AFTER they had their chance to fire this turn (ADR-008)
    ['decoy','armor','suppress','ghost'].forEach(k => { if ((this.shields as any)[k] > 0) (this.shields as any)[k]--; });
  }

  resolveEvent(choiceIdx: number): string[] {
    if (!this.pendingEvent) return [];
    const choice = this.pendingEvent.choices[choiceIdx];
    const logs = ['EVENT: ' + choice.label];
    choice.apply().forEach(a => this.store.dispatch(a));
    this.pendingEvent = null;
    const e = this.checkEnding(); if (e) logs.push('ENDING: ' + e);
    return logs;
  }

  /** Resolve a pending ambush with the chosen tactics policy. */
  resolveBattle(policy: Policy): string[] {
    if (!this.pendingBattle) return [];
    this.pendingBattle = false;
    const cover = new Set(['4,1', '7,5', '2,6']); // crates, vehicles, doorways
    const result = autoBattle(heroSquad(this.heroId), taskForceSquad(this.s.heat, this.rng), cover, this.rng, policy);
    const logs = result.log.slice(-3);
    if (result.winner === 'heroes') {
      this.store.dispatch({ type: 'HEAT', payload: -10 });
      this.store.dispatch({ type: 'POWDER', payload: 15 });
      logs.push('Route held. Salvage +15 Powder, Heat -10.');
    } else if (result.winner === 'draw') {
      this.store.dispatch({ type: 'HEAT', payload: -4 });
      logs.push('Slipped the cordon. Heat -4, nothing gained.');
    } else {
      this.store.dispatch({ type: 'POWDER', payload: -Math.round(this.s.powder * 0.25) });
      this.store.dispatch({ type: 'CASE_UP', payload: 8 });
      this.store.dispatch({ type: 'REP', payload: { k: 'press', v: -5 } });
      logs.push('Crew scattered. 25% Powder seized, Kenji gets footage. Case +8.');
    }
    this.checkEnding();
    return logs;
  }

  /** Raid resolution: 'loss' takes the hit; 'bribe' costs 60 Powder. */
  resolveRaid(mode: 'loss' | 'bribe'): string[] {
    const logs: string[] = [];
    if (mode === 'bribe' && this.s.powder >= 60) {
      this.store.dispatch({ type: 'POWDER', payload: -60 });
      this.store.dispatch({ type: 'HEAT', payload: -10 });
      this.store.dispatch({ type: 'REP', payload: { k: 'jtf', v: 4 } });
      logs.push('RAID bought off: 60 Powder in hardware wallets. A scheduling conflict develops.');
    } else {
      const loss = Math.round(this.s.powder * 0.25);
      this.store.dispatch({ type: 'POWDER', payload: -loss });
      this.store.dispatch({ type: 'HEAT', payload: -15 });
      this.store.dispatch({ type: 'CASE_UP', payload: this.s.rep.press >= 60 ? 4 : 8 });
      this.store.dispatch({ type: 'REP', payload: { k: 'press', v: -6 } });
      logs.push('RAID: ' + loss + ' Powder seized. Kenji films the container opening.');
    }
    this.pendingRaid = false;
    const e = this.checkEnding(); if (e) logs.push('ENDING: ' + e);
    return logs;
  }

  /** Q/W operator abilities. Returns log lines; no-op (with reason) when on cooldown. */
  useOpsAbility(id: string): string[] {
    const def = OPS_ABILITIES[this.heroId].find(a => a.id === id);
    if (!def || this.ending) return [];
    if ((this.cds[id] || 0) > 0) return [def.name + ' is on cooldown (' + this.cds[id] + ').'];
    this.cds[id] = def.cd;
    const logs: string[] = [];
    switch (id) {
      case 'laugh':
        this.store.dispatch({ type: 'HEAT', payload: -12 });
        this.store.dispatch({ type: 'REP', payload: { k: 'dock', v: 10 } });
        this.store.dispatch({ type: 'CASE_UP', payload: -4 });
        logs.push('The laugh rolls across three time zones. Heat -12, Dockside +10.'); break;
      case 'decoy':
        this.store.dispatch({ type: 'HEAT', payload: -10 });
        this.store.dispatch({ type: 'CASE_UP', payload: 3 });
        this.shields.decoy = 1;
        logs.push('Pattaya police seize a speedboat of green bricks. Next raid fails.'); break;
      case 'ghost':
        this.shields.ghost = 2;
        logs.push('The dullest vehicles on any road. Zero Heat for 2 moves.'); break;
      case 'paperwork':
        this.shields.armor = 2;
        logs.push('Correct weight. Correct seals. Next 2 raids fail.'); break;
      case 'downstairs':
        this.store.dispatch({ type: 'HEAT', payload: -18 });
        this.store.dispatch({ type: 'REP', payload: { k: 'sov', v: 8 } });
        this.shields.suppress = 3;
        logs.push('The weather changes. Heat -18, Sovereignty +8. Case slowed 3 moves.'); break;
      case 'blackbudget':
        this.shields.double = 1;
        logs.push('Offshore ledgers align. Next action yields DOUBLE.'); break;
    }
    return logs;
  }

  /** Restore a saved GameState (shields/cooldowns reset by design — see ADR-007). */
  restore(s: GameState): void {
    this.store = createStore<GameState>(gameReducer, s);
    this.shields = { decoy: 0, armor: 0, suppress: 0, ghost: 0, double: 0 };
    this.cds = {}; this.pendingEvent = null; this.pendingRaid = false; this.ending = null;
  }

  private checkEnding(): Ending {
    if (this.s.drill >= 100) return this.ending = 'concrete-dawn';
    if (this.s.kas >= 100) return this.ending = 'berth-44';
    return null;
  }
}
