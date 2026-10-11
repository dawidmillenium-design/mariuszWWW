// INVESTIGATOR campaign — Episode Six inverted perspective.
// You are Kenji's task force. Same world, same clocks, opposite goal: CASE to 100 before the DRILL.
// Resource: WARRANTS. Investigations cost 1; refill +1 every 3 moves (cap 5).
import { createStore, gameReducer, initialState, GameState, Store } from '../store/gameStore';
import { neighbors, nodeById } from './world';

export type RNG = () => number;
export type InvEnding = 'case-closed' | 'concrete-dawn' | null;

export class Investigator {
  store: Store<GameState>;
  warrants = 3;
  moves = 0;
  ending: InvEnding = null;
  constructor(private rng: RNG = Math.random) {
    this.store = createStore<GameState>(gameReducer, initialState);
    this.store.dispatch({ type: 'TRAVEL', payload: 'berth' }); // Episode Six opens at Berth 44
  }
  get s(): GameState { return this.store.getState(); }
  canInvestigate(id: string): boolean {
    return !this.ending && this.warrants > 0 && neighbors(this.s.node).includes(id);
  }
  /** Investigate an adjacent node. Returns log lines. */
  investigate(id: string): string[] {
    const logs: string[] = [];
    if (!this.canInvestigate(id)) { logs.push('Cannot investigate ' + id + ' (adjacency or warrants).'); return logs; }
    this.warrants--;
    this.store.dispatch({ type: 'TRAVEL', payload: id });
    const n = nodeById(id);
    const heatBonus = Math.floor(this.s.heat / 25);
    switch (n.type) {
      case 'extract':
        this.store.dispatch({ type: 'CASE_UP', payload: 2 + heatBonus });
        logs.push('SURVEILLANCE @ ' + n.name + ': long lenses on the compound. Case +' + (2 + heatBonus));
        if (this.rng() < 0.3) { this.store.dispatch({ type: 'CASE_UP', payload: 5 }); logs.push('An informant steps out of the tree line. Case +5.'); }
        break;
      case 'transit':
        this.store.dispatch({ type: 'CASE_UP', payload: 3 + heatBonus });
        logs.push('TAIL @ ' + n.name + ': three plates, one shell company. Case +' + (3 + heatBonus));
        if (this.s.powder > 20) { this.store.dispatch({ type: 'POWDER', payload: -20 }); this.store.dispatch({ type: 'CASE_UP', payload: 3 }); logs.push('K9 unit hits a courier cache: 20 Powder seized. Case +3.'); }
        break;
      case 'launder':
        this.store.dispatch({ type: 'CASE_UP', payload: 3 + heatBonus });
        logs.push('AUDIT @ ' + n.name + ': the ledger almost balances. Almost. Case +' + (3 + heatBonus));
        break;
      case 'dig':
        this.store.dispatch({ type: 'CASE_UP', payload: 5 + heatBonus });
        this.store.dispatch({ type: 'DRILL', payload: -2 });
        logs.push('SEISMIC SWEEP @ The Artery: they feel the microphones. Case +' + (5 + heatBonus) + ', Drill -2%.');
        break;
    }
    this.store.dispatch({ type: 'HEAT', payload: 1 }); // pressure rattles the operator
    this.moves++;
    if (this.moves % 3 === 0 && this.warrants < 5) { this.warrants++; logs.push('Judge signs fresh warrants (+1).'); }
    // operator keeps digging — the dual clock is the enemy (Episode Six)
    if (this.moves % 3 === 0) { this.store.dispatch({ type: 'DRILL', payload: 2 }); logs.push('Underground, the hum continues. Drill +2%.'); }
    if (this.s.kas >= 100) this.ending = 'case-closed';
    if (this.s.drill >= 100) this.ending = 'concrete-dawn';
    return logs;
  }
}
