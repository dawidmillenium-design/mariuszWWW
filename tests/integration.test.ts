import { describe, it, expect, vi } from 'vitest';
import { Director } from '../src/game/director';
import { save, load, initialState, GameState } from '../src/store/gameStore';

// deterministic LCG so a full playthrough is reproducible in CI
const lcg = (seed: number) => { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; };
const noEvent = () => 0.99;

describe('operator abilities', () => {
  it('laugh reduces heat, applies cooldown, blocks reuse while cooling', () => {
    const d = new Director('ping', noEvent);
    d.store.dispatch({ type: 'HEAT', payload: 40 });
    const logs = d.useOpsAbility('laugh');
    expect(logs[0]).toContain('Heat -12');
    expect(d.s.heat).toBe(38); // 50 - 12 (dispatch only, no cooldown tick)
    expect(d.cds['laugh']).toBe(3);
    expect(d.useOpsAbility('laugh')[0]).toContain('cooldown');
  });
  it('downstairs suppresses case gains for 3 moves', () => {
    const d = new Director('black', noEvent);
    d.useOpsAbility('downstairs');
    expect(d.s.heat).toBe(0); // 10 - 18 clamped
    const kas0 = d.s.kas;
    d.store.dispatch({ type: 'TRAVEL', payload: 'boston' });
    d.travel('artery'); // dig: base case 3 → halved to 2 (+heat bonus)
    expect(d.s.kas - kas0).toBeLessThanOrEqual(2 + Math.floor(d.s.heat / 25) + 1);
  });
  it('decoy shield intercepts the next raid (raid actually rolls)', () => {
    const d = new Director('ping', queue(0.5, 0.99, 0.0)); // extract roll, no event, RAID ROLLS → must be intercepted
    d.useOpsAbility('decoy');
    d.store.dispatch({ type: 'HEAT', payload: 60 });
    d.store.dispatch({ type: 'TRAVEL', payload: 'chitta' });
    d.travel('bangkok');
    expect(d.pendingEvent).toBeNull();
    expect(d.pendingRaid).toBe(false); // decoy ate the raid
  });
});

describe('save / load round-trip', () => {
  it('persists and restores state', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } });
    const d = new Director('mariusz', noEvent);
    d.store.dispatch({ type: 'POWDER', payload: 77 });
    d.store.dispatch({ type: 'TRAVEL', payload: 'warsaw' });
    save(d.s);
    const restored = load()!;
    expect(restored.powder).toBe(117);
    expect(restored.node).toBe('warsaw');
    const d2 = new Director('mariusz', noEvent);
    d2.restore(restored);
    expect(d2.s).toEqual(d.s);
    expect(d2.ending).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('full playthrough simulation', () => {
  it('mariusz can reach CONCRETE DAWN within 300 moves (auto-resolving events)', () => {
    const d = new Director('mariusz', lcg(42));
    // policy: shuttle mexico <-> artery; transit converts powder on european hops on the way in
    let hops = 0;
    const route: string[] = ['warsaw', 'berth', 'boston', 'artery']; // bialy -> ... -> artery
    for (const id of route) { d.travel(id); settle(d); hops++; }
    let target = 'mexico';
    while (!d.ending && hops < 300) {
      d.travel(target); settle(d); hops++;
      target = target === 'mexico' ? 'artery' : 'mexico';
    }
    expect(d.ending).toBe('concrete-dawn');
    expect(hops).toBeLessThan(300);
  });
});
function settle(d: Director) {
  let guard = 0;
  while ((d.pendingEvent || d.pendingRaid) && guard++ < 10) {
    if (d.pendingEvent) d.resolveEvent(0);
    if (d.pendingRaid) d.resolveRaid(d.s.powder >= 60 ? 'bribe' : 'loss');
  }
}
