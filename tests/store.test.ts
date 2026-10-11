import { describe, it, expect } from 'vitest';
import { createStore, gameReducer, initialState, GameState } from '../src/store/gameStore';
describe('state store', () => {
  it('applies granular economy actions with clamps', () => {
    const s = createStore<GameState>(gameReducer, initialState);
    s.dispatch({ type: 'POWDER', payload: 30 });
    expect(s.getState().powder).toBe(70);
    s.dispatch({ type: 'CLEAN', payload: -999 });
    expect(s.getState().clean).toBe(0);
    s.dispatch({ type: 'DRILL', payload: 500 });
    expect(s.getState().drill).toBe(100);
  });
  it('undo rewinds one action (evidence chain)', () => {
    const s = createStore<GameState>(gameReducer, initialState);
    s.dispatch({ type: 'TRAVEL', payload: 'rio' });
    expect(s.getState().node).toBe('rio');
    expect(s.undo()).toBe(true);
    expect(s.getState().node).toBe('bangkok');
  });
  it('reputation changes are clamped 0..100', () => {
    const s = createStore<GameState>(gameReducer, initialState);
    s.dispatch({ type: 'REP', payload: { k: 'dock', v: 999 } });
    expect(s.getState().rep.dock).toBe(100);
  });
  it('HEAT and CASE clamp both directions', () => {
    const s = createStore<GameState>(gameReducer, initialState);
    s.dispatch({ type: 'HEAT', payload: 999 }); expect(s.getState().heat).toBe(100);
    s.dispatch({ type: 'HEAT', payload: -999 }); expect(s.getState().heat).toBe(0);
    s.dispatch({ type: 'CASE_UP', payload: 999 }); expect(s.getState().kas).toBe(100);
  });
});
