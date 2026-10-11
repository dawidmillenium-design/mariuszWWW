import { describe, it, expect } from 'vitest';
import { NODES, EDGES, neighbors, nodeById, adjacency, EVENT_POOL } from '../src/game/world';
describe('2026 ops grid', () => {
  it('has exactly 18 nodes incl. all 2026 additions', () => {
    expect(NODES).toHaveLength(18);
    ['berth','krakow','hydra','mombasa','lagos','mexico','cartag','puerto'].forEach(id =>
      expect(NODES.find(n => n.id === id), id).toBeDefined());
    expect(nodeById('berth').name).toContain('Rotterdam');
    expect(nodeById('lagos').name).toContain('Nigeria');
  });
  it('every edge references existing nodes and is symmetric', () => {
    const ids = new Set(NODES.map(n => n.id));
    EDGES.forEach(([a, b]) => {
      expect(ids.has(a) && ids.has(b)).toBe(true);
      expect(neighbors(a)).toContain(b);
      expect(neighbors(b)).toContain(a);
    });
  });
  it('graph is fully connected (BFS from jungle reaches all)', () => {
    const seen = new Set(['jungle']); const q = ['jungle'];
    while (q.length) { const c = q.pop()!; neighbors(c).forEach(n => { if (!seen.has(n)) { seen.add(n); q.push(n); } }); }
    expect(seen.size).toBe(NODES.length);
  });
  it('exactly one dig node: The Artery', () => {
    expect(NODES.filter(n => n.type === 'dig').map(n => n.id)).toEqual(['artery']);
  });
  it('region spread matches canon: Asia 5 / Europe 5 / Americas+Africa 8', () => {
    const c = { asia: 0, europe: 0, americas: 0 };
    NODES.forEach(n => c[n.region]++);
    expect(c).toEqual({ asia: 5, europe: 5, americas: 8 });
  });
  it('all node coordinates fit the 960x560 strategy-map canvas', () => {
    NODES.forEach(n => { expect(n.x).toBeGreaterThanOrEqual(0); expect(n.x).toBeLessThanOrEqual(960);
      expect(n.y).toBeGreaterThanOrEqual(0); expect(n.y).toBeLessThanOrEqual(560); });
  });
  it('home nodes of all three heroes exist on grid', () => {
    ['bangkok', 'bialy', 'rio'].forEach(id => expect(adjacency[id].length).toBeGreaterThan(0));
  });
  it('event pool has 6 scenario events with 2 choices each and valid actions', () => {
    expect(EVENT_POOL).toHaveLength(7); // 6 canon + Mr Bannny (v1.3)
    EVENT_POOL.forEach(e => {
      expect(e.choices).toHaveLength(2);
      e.choices.forEach(c => c.apply().forEach(a => expect(a.type).toMatch(/^(REP|HEAT|CASE_UP|CLEAN|POWDER)$/)));
    });
  });
});
