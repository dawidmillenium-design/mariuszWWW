// Minimal deterministic store with undo (time-travel) — powers save files & the Investigator's "evidence chain" rewind.
export interface Action<T = any> { type: string; payload?: T }
export interface Store<S> {
  getState(): S;
  dispatch(a: Action): void;
  subscribe(fn: (s: S) => void): () => void;
  undo(): boolean;
}
export function createStore<S>(reducer: (s: S, a: Action) => S, initial: S, historyLimit = 50): Store<S> {
  let state = initial;
  let past: S[] = [];
  const subs = new Set<(s: S) => void>();
  return {
    getState: () => state,
    dispatch(a) { past.push(state); if (past.length > historyLimit) past.shift();
      state = reducer(state, a); subs.forEach(f => f(state)); },
    subscribe(fn) { subs.add(fn); return () => { subs.delete(fn); }; },
    undo() { if (!past.length) return false; state = past.pop()!; subs.forEach(f => f(state)); return true; }
  };
}
// --- Game state shape (Scenario Episode Six: persistent world, dual clocks) ---
export interface GameState {
  powder: number; clean: number; heat: number; drill: number; kas: number;
  rep: { sov: number; jtf: number; dock: number; press: number };
  node: string; moves: number; flags: Record<string, boolean>;
}
export const initialState: GameState = {
  powder: 40, clean: 30, heat: 10, drill: 14, kas: 12,
  rep: { sov: 40, jtf: 20, dock: 50, press: 30 },
  node: 'bangkok', moves: 0, flags: {}
};
const clamp = (v: number) => Math.max(0, Math.min(100, v));
export function gameReducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'POWDER':    return { ...s, powder: Math.max(0, s.powder + a.payload) };
    case 'CLEAN':     return { ...s, clean: Math.max(0, s.clean + a.payload) };
    case 'HEAT':      return { ...s, heat: clamp(s.heat + a.payload) };
    case 'DRILL':     return { ...s, drill: clamp(s.drill + a.payload) };
    case 'CASE_UP':   return { ...s, kas: clamp(s.kas + a.payload) };
    case 'COOLDOWN':  return { ...s, heat: clamp(s.heat - 2) };
    case 'MOVE_TICK': return { ...s, moves: s.moves + 1 };
    case 'REP':       return { ...s, rep: { ...s.rep, [a.payload.k]: clamp(s.rep[a.payload.k as keyof GameState['rep']] + a.payload.v) } };
    case 'TRAVEL':    return { ...s, node: a.payload };
    case 'FLAG':      return { ...s, flags: { ...s.flags, [a.payload.k]: a.payload.v } };
    default: return s;
  }
}
export const SAVE_KEY = 'shadow-routes-save';
export function save(s: GameState) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {} }
export function load(): GameState | null { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
