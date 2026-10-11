// Modal overlays — field events, raids, endings. Imperative DOM, promise-free callbacks.
import { GameEvent } from '../game/world';
import { Policy } from '../game/encounter';
import { GameState } from '../store/gameStore';

function overlay(html: string): HTMLElement {
  const d = document.createElement('div');
  d.className = 'modal-overlay';
  d.innerHTML = '<div class="modal-box">' + html + '</div>';
  document.body.appendChild(d);
  return d;
}
export function showEvent(ev: GameEvent, onChoose: (i: number) => void): void {
  const img = ev.image ? '<img src="' + ev.image + '" style="width:100%;border:1px solid #2f6b3a;margin-bottom:8px;image-rendering:pixelated">' : '';
  const d = overlay('<h3 style="color:#7dff8a">◈ FIELD EVENT</h3>' + img + '<p>' + ev.text + '</p>' +
    ev.choices.map((c, i) => '<button class="m-btn" data-i="' + i + '">' + (i + 1) + ') ' + c.label + '</button>').join('') +
    '<div class="m-hint">Press 1 or 2</div>');
  const pick = (i: number) => { d.remove(); onChoose(i); };
  d.querySelectorAll<HTMLButtonElement>('.m-btn').forEach(b => b.onclick = () => pick(Number(b.dataset.i)));
  const key = (e: KeyboardEvent) => { if (e.key === '1') { cleanup(); pick(0); } if (e.key === '2') { cleanup(); pick(1); } };
  const cleanup = () => removeEventListener('keydown', key);
  addEventListener('keydown', key);
}
export function showRaid(s: GameState, onResolve: (mode: 'loss' | 'bribe') => void): void {
  const canBribe = s.powder >= 60;
  const d = overlay('<h3 style="color:#ff5050">⚠ JOINT TASK FORCE RAID ⚠</h3>' +
    '<p>Doors cut. Flashlights. Kenji is HERE. Powder on hand: ' + s.powder + '</p>' +
    '<button class="m-btn" data-m="loss">1) Take the loss — 25% Powder seized, Heat resets, Case +8</button>' +
    '<button class="m-btn" data-m="bribe"' + (canBribe ? '' : ' disabled') + '>2) Buy your way out — 60 Powder' + (canBribe ? '' : ' (need 60)') + '</button>');
  d.querySelectorAll<HTMLButtonElement>('.m-btn').forEach(b => b.onclick = () => { const m = b.dataset.m as 'loss' | 'bribe'; if (m === 'loss' || canBribe) { d.remove(); onResolve(m); } });
  const key = (e: KeyboardEvent) => { if (e.key === '1') { d.remove(); cleanup(); onResolve('loss'); } if (e.key === '2' && canBribe) { d.remove(); cleanup(); onResolve('bribe'); } };
  const cleanup = () => removeEventListener('keydown', key);
  addEventListener('keydown', key);
}
export function showEnding(ending: string, s: GameState, heroName: string, onRestart: () => void): void {
  const win = ending === 'concrete-dawn';
  overlay('<h3 style="color:' + (win ? '#39ff6a' : '#ff5050') + '">' + (win ? 'CONCRETE DAWN' : 'BERTH 44') + '</h3>' +
    '<p>' + (win ? 'The drill breaks through. DOWNSTAIRS opens for business.' : 'One verified chain. Nine countries, one synchronized hour.') + '</p>' +
    '<div class="stat"><span>OPERATOR</span><b>' + heroName + '</b></div>' +
    '<div class="stat"><span>MOVES</span><b>' + s.moves + '</b></div>' +
    '<div class="stat"><span>DRILL</span><b>' + s.drill + '%</b></div>' +
    '<div class="stat"><span>CASE FILE</span><b>' + s.kas + '%</b></div>' +
    '<button class="m-btn" id="restart">RUN IT BACK (ENTER)</button>');
  document.getElementById('restart')!.onclick = onRestart;
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter') { cleanup(); onRestart(); } };
  const cleanup = () => removeEventListener('keydown', key);
  addEventListener('keydown', key);
}

export function showBattleChoice(nodeName: string, onPick: (p: Policy) => void): void {
  const d = overlay('<h3 style="color:#ff5050">⚔ TASK FORCE AMBUSH — ' + nodeName + '</h3>' +
    '<p>A team on the wire. Your crew is armed. Choose tactics:</p>' +
    '<button class="m-btn" data-p="aggressive">1) AGGRESSIVE — close and crush (favored when you outnumber them)</button>' +
    '<button class="m-btn" data-p="defensive">2) DEFENSIVE — hold cover, make them come to you (safer when outgunned)</button>');
  d.querySelectorAll<HTMLButtonElement>('.m-btn').forEach(b => b.onclick = () => { const p = b.dataset.p as Policy; d.remove(); onPick(p); });
  const key = (e: KeyboardEvent) => { if (e.key === '1') { cleanup(); d.remove(); onPick('aggressive'); } if (e.key === '2') { cleanup(); d.remove(); onPick('defensive'); } };
  const cleanup = () => removeEventListener('keydown', key);
  addEventListener('keydown', key);
}
export function showBattleLog(log: string[]): void {
  const d = overlay('<h3 style="color:#7dff8a">⚔ AFTER-ACTION REPORT</h3>' +
    '<div style="max-height:260px;overflow-y:auto;font-size:11px;line-height:1.6">' +
    log.map(l => '<div>' + l + '</div>').join('') + '</div>' +
    '<button class="m-btn" id="ack">CONTINUE (ENTER)</button>');
  document.getElementById('ack')!.onclick = () => d.remove();
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter') { cleanup(); d.remove(); } };
  const cleanup = () => removeEventListener('keydown', key);
  addEventListener('keydown', key);
}
