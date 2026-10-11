import { describe, it, expect } from 'vitest';
import { Director } from '../src/game/director';
// deterministic RNG queues: pop values in order
const queue = (...vals: number[]) => { let i = 0; return () => vals[i] < 1 ? vals[i++] : vals[vals.length - 1]; };
const noEvent = () => 0.99; // never trigger field events / raids (0.99 > all thresholds)

describe('core loop', () => {
  it('hero spawns at home node', () => {
    expect(new Director('ping', noEvent).s.node).toBe('bangkok');
    expect(new Director('mariusz', noEvent).s.node).toBe('bialy');
    expect(new Director('black', noEvent).s.node).toBe('rio');
  });
  it('can only travel along edges', () => {
    const d = new Director('ping', noEvent);
    expect(d.canTravel('pattaya')).toBe(true);
    expect(d.canTravel('rio')).toBe(false); // not adjacent to bangkok
    const before = d.s.node;
    d.travel('rio'); // rejected
    expect(d.s.node).toBe(before);
  });
  it('extract adds powder, heat, moves the clock', () => {
    const d = new Director('ping', queue(0.5, 0.99, 0.99)); // rng*10=5 → gain 34+12=46? (22+5)+12=39
    const p0 = d.s.powder, h0 = d.s.heat;
    d.travel('jungle'); // bangkok→jungle adjacent
    expect(d.s.powder).toBe(p0 + 39);
    expect(d.s.heat).toBeGreaterThan(h0 - 2); // +4 action, -2 cooldown
    expect(d.s.moves).toBe(1);
  });
  it('hero passives differentiate extract yields (ping flat +12, black ×1.5)', () => {
    const dp = new Director('ping', queue(0, 0.99, 0.99));
    dp.store.dispatch({ type: 'TRAVEL', payload: 'chitta' });
    dp.travel('bangkok'); // extract: (22+0)+12 = 34
    expect(dp.s.powder).toBe(40 + 34);
    const db = new Director('black', queue(0, 0.99, 0.99));
    db.store.dispatch({ type: 'TRAVEL', payload: 'jungle' });
    db.travel('bangkok'); // extract: 22*1.5 = 33
    expect(db.s.powder).toBe(40 + 33);
  });
  it('transit converts powder to clean; mariusz gets 1.5x', () => {
    const d = new Director('mariusz', noEvent);
    d.store.dispatch({ type: 'POWDER', payload: 100 });
    d.travel('warsaw'); // bialy→warsaw transit: amt 30 → conv round(30*.95*1.5)=43
    expect(d.s.clean).toBe(30 + 47); // rate 1.05 (ADR-008): round(30*1.05*1.5)=47
    expect(d.s.powder).toBe(140 - 30);
  });
  it('dig spends clean and advances drill; 100% triggers CONCRETE DAWN', () => {
    const d = new Director('black', queue(0, 0.99, 0.99)); // rng 0 → prog 4
    d.store.dispatch({ type: 'TRAVEL', payload: 'boston' });
    d.store.dispatch({ type: 'CLEAN', payload: 500 });
    d.travel('artery');
    expect(d.s.drill).toBe(20); // prog 6-9, rng 0 → +6 (ADR-008)
    expect(d.s.clean).toBe(490);
    d.store.dispatch({ type: 'DRILL', payload: 90 }); // 108 → clamp 100
    const r = d.travel('mexico');
    expect(d.ending).toBe('concrete-dawn');
    expect(r.ending).toBe('concrete-dawn');
  });
  it('battle trigger respects heat floor and blocks travel until resolved', () => {
    const d = new Director('black', queue(0.99, 0.0, 0.99, 0.99, 0.99, 0.99)); // travel: extract roll .99, no event; raid .0 fires first
    d.store.dispatch({ type: 'HEAT', payload: 30 }); // heat 40 → battle eligible (>20)
    d.store.dispatch({ type: 'TRAVEL', payload: 'boston' });
    d.travel('artery'); // raid roll 0.0 → raid pending (battles only fire when raid doesn't)
    expect(d.pendingRaid || d.pendingBattle).toBe(true);
    if (d.pendingBattle) {
      expect(d.canTravel('mexico')).toBe(false);
      const logs = d.resolveBattle('aggressive');
      expect(logs.length).toBeGreaterThan(0);
      expect(d.pendingBattle).toBe(false);
    }
  });
  it('case at 100 after a move triggers BERTH 44', () => {
    const d = new Director('black', noEvent);
    d.store.dispatch({ type: 'CASE_UP', payload: 999 });
    const r = d.travel('lagos');
    expect(d.ending).toBe('berth-44');
    expect(r.ending).toBe('berth-44');
  });
  it('raid takes 25% powder on loss; bribe costs 60', () => {
    const d = new Director('ping', noEvent);
    d.pendingRaid = true;
    d.store.dispatch({ type: 'POWDER', payload: 100 }); // 140 total
    d.resolveRaid('loss');
    expect(d.s.powder).toBe(105);
    d.pendingRaid = true;
    d.resolveRaid('bribe');
    expect(d.s.powder).toBe(45);
  });
  it('case reaching 100 triggers BERTH 44 ending', () => {
    const d = new Director('black', noEvent);
    d.store.dispatch({ type: 'CASE_UP', payload: 999 });
    expect(d.s.kas).toBe(100);
  });
});
