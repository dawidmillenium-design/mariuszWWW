import { describe, it, expect, vi } from 'vitest';
import { AudioEngine } from '../src/ui/audio';
describe('audio engine', () => {
  it('synthesizes sfx and theme without assets (fake AudioContext)', () => {
    const started: number[] = [];
    const FakeAC = class {
      state = 'running'; currentTime = 0; destination = {};
      resume() { return Promise.resolve(); }
      createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      createOscillator() { return { type: '', frequency: { value: 0, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    };
    vi.stubGlobal('window', { AudioContext: FakeAC, setInterval: () => 1, clearInterval: () => {}, webkitAudioContext: FakeAC });
    const a = new AudioEngine();
    expect(() => { a.sfx('click'); a.sfx('raid'); a.sfx('win'); }).not.toThrow();
    a.startTheme(); a.stopTheme();
    vi.unstubAllGlobals();
    expect(true).toBe(true);
  });
});
