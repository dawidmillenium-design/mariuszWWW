import { describe, it, expect } from 'vitest';
import { Investigator } from '../src/game/investigator';
const lcg = (seed: number) => { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; };
const noLuck = () => 0.99; // no informants

describe('investigator campaign (Episode Six)', () => {
  it('opens at Berth 44, gated by adjacency and warrants', () => {
    const inv = new Investigator(lcg(5));
    expect(inv.s.node).toBe('berth');
    expect(inv.canInvestigate('boston')).toBe(true);
    expect(inv.canInvestigate('jungle')).toBe(false);
    inv.investigate('boston');
    expect(inv.s.kas).toBeGreaterThan(12);
    expect(inv.warrants).toBe(2);
    inv.warrants = 0;
    const before = inv.s.kas;
    inv.investigate('warsaw');
    expect(inv.s.kas).toBe(before); // blocked
  });
  it('transit nodes seize powder when available', () => {
    const inv = new Investigator(lcg(5));
    inv.store.dispatch({ type: 'TRAVEL', payload: 'bialy' });
    inv.store.dispatch({ type: 'POWDER', payload: 100 });
    const p0 = inv.s.powder;
    inv.investigate('warsaw'); // transit
    expect(inv.s.powder).toBe(p0 - 20);
    expect(inv.s.kas).toBeGreaterThan(12 + 3);
  });
  it('seismic sweep at the Artery sets the drill back 2%', () => {
    const inv = new Investigator(noLuck);
    inv.investigate('boston');
    const before = inv.s.drill;
    inv.investigate('artery');
    expect(inv.s.drill).toBe(before - 2);
  });
  it('CASE CLOSED ending at 100', () => {
    const inv = new Investigator(noLuck);
    inv.store.dispatch({ type: 'CASE_UP', payload: 90 });
    inv.investigate('boston');  // 92+3 → ~97+
    inv.investigate('artery');  // sweep +5 → 100 clamp
    expect(inv.ending).toBe('case-closed');
  });
  it('operator drill dooms the idle investigator (CONCRETE DAWN)', () => {
    const inv = new Investigator(noLuck);
    inv.store.dispatch({ type: 'DRILL', payload: 86 }); // 14+86 = 100 (clamped)
    inv.investigate('boston'); // ending check fires on investigation
    expect(inv.ending).toBe('concrete-dawn');
  });
  it('warrants refill +1 every 3 successful investigations (cap 5)', () => {
    const inv = new Investigator(noLuck);
    inv.warrants = 2;
    inv.investigate('boston');  // 2→1, move 1
    inv.investigate('artery');  // 1→0, move 2
    expect(inv.warrants).toBe(0);
    inv.warrants = 1;           // simulate mid-run grant
    inv.investigate('mexico');  // 1→0, move 3 → refill +1
    expect(inv.warrants).toBe(1);
  });
});
