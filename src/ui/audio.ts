// Chiptune audio — WebAudio square-wave SFX + a looped arpeggio theme. No assets, all synthesized.
export type SfxName = 'click' | 'move' | 'good' | 'bad' | 'ability' | 'raid' | 'win' | 'lose';
export class AudioEngine {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private themeTimer: number | null = null;
  private step = 0;
  private ensure(): AudioContext | null {
    if (!this.ac) { try { this.ac = new (window.AudioContext || (window as any).webkitAudioContext)(); this.master = this.ac.createGain(); this.master.gain.value = 0.16; this.master.connect(this.ac.destination); } catch { return null; } }
    if (this.ac.state === 'suspended') this.ac.resume();
    return this.ac;
  }
  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.5, slide = 0) {
    const ac = this.ensure(); if (!ac || !this.master) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ac.currentTime + dur);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g); g.connect(this.master); o.start(); o.stop(ac.currentTime + dur);
  }
  sfx(name: SfxName) {
    switch (name) {
      case 'click':   this.tone(660, 0.06); break;
      case 'move':    this.tone(220, 0.14, 'sawtooth', 0.3); break;
      case 'good':    this.tone(523, 0.08); setTimeout(() => this.tone(784, 0.1), 90); break;
      case 'bad':     this.tone(160, 0.22, 'sawtooth', 0.5); break;
      case 'ability': this.tone(880, 0.07); setTimeout(() => this.tone(1174, 0.09), 80); break;
      case 'raid':    this.tone(110, 0.35, 'sawtooth', 0.6); setTimeout(() => this.tone(92, 0.35, 'sawtooth', 0.6), 180); break;
      case 'win':     [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18), i * 140)); break;
      case 'lose':    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sawtooth', 0.4), i * 160)); break;
    }
  }
  // 8-step minor arpeggio, 2 bars — "the route theme". Frequencies computed from A minor pentatonic.
  private themeFreqs(): number[] {
    const A4 = 440;
    const semi = (n: number) => A4 * Math.pow(2, n / 12);
    return [semi(0), semi(3), semi(5), semi(7), semi(10), semi(7), semi(5), semi(3)];
  }
  startTheme() {
    if (this.themeTimer !== null) return; if (!this.ensure()) return;
    const f = this.themeFreqs();
    this.step = 0;
    this.themeTimer = window.setInterval(() => {
      const n = f[this.step % f.length];
      this.tone(n, 0.16, 'triangle', 0.5);
      if (this.step % 4 === 0) this.tone(n / 2, 0.3, 'sine', 0.5); // bass
      this.step++;
    }, 210);
  }
  stopTheme() { if (this.themeTimer !== null) { clearInterval(this.themeTimer); this.themeTimer = null; } }
}
/** Map a Director TurnResult to sounds — single choke point, called once per travel. */
export function sfxForResult(audio: AudioEngine, result: { logs: string[]; event?: unknown; raid?: boolean; ending?: string | null }) {
  if (result.ending) { audio.sfx(result.ending === 'concrete-dawn' ? 'win' : 'lose'); return; }
  if (result.raid) { audio.sfx('raid'); return; }
  if (result.event) { audio.sfx('click'); return; }
  const t = result.logs.join(' ');
  if (t.includes('EXTRACT') || t.includes('TRANSIT') || t.includes('LAUNDER') || t.includes('DIG')) audio.sfx('good');
  else if (t.includes('no cargo') || t.includes('idle') || t.includes('Cannot')) audio.sfx('bad');
  else audio.sfx('move');
}
