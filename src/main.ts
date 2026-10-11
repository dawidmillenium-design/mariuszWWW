// SHADOW ROUTES v1.0 — bootstrap. State machine: TITLE → SELECT → GAME → CINEMATIC.
// Dual canvas: 2D ops grid (map/text) + WebGL sprite/lighting layer. CRT post-pass via CSS.
import { Director, HeroId } from './game/director';
import { NODES, EDGES, nodeById, neighbors } from './game/world';
import { HEROES } from './data/heroes';
import { OPS_ABILITIES } from './game/abilities';
import { save, load, GameState } from './store/gameStore';
import { Renderer, Light } from './engine/renderer';
import { renderHUD, HudDeps } from './ui/hud';
import { showEvent, showRaid, showEnding, showBattleChoice, showBattleLog } from './ui/modals';
import { Investigator } from './game/investigator';
import { AudioEngine, sfxForResult } from './ui/audio';

const W = 960, H = 560;
const mapImg = new Image(); mapImg.src = 'assets/map-strategy.png'; // v1.2 strategy map (ADR-011)
const selImg = new Image(); selImg.src = 'assets/select-screen.png'; // v1.3 cinematic select (ADR-012)
const HERO_KEY = 'shadow-routes-hero';
const audio = new AudioEngine();

// ---------- styles (incl. CRT post-processing pass) ----------
const css = document.createElement('style');
css.textContent = `*{margin:0;padding:0;box-sizing:border-box}body{background:#07090c;color:#cfe3c0;font-family:'Courier New',monospace;height:100vh;overflow:hidden}
#wrap{display:flex;height:100vh}#side{width:280px;min-width:280px;background:#0c1014;border-right:2px solid #1e3a24;padding:10px;font-size:12px;display:flex;flex-direction:column;gap:4px;overflow-y:auto}
#main{flex:1;display:flex;flex-direction:column;position:relative}canvas{display:block;image-rendering:pixelated}
#map{position:absolute;inset:0;width:100%;height:calc(100vh - 110px)}#gl{position:absolute;inset:0;width:100%;height:calc(100vh - 110px);pointer-events:none}
#cmd-bar{position:absolute;bottom:110px;left:0;right:0;display:flex;gap:6px;padding:4px 8px;background:rgba(8,12,16,.9);border-top:1px solid #1e3a24;z-index:6}\n#cmd-bar .slot{flex:1;border:1px solid #2a4a5a;background:#0c1218;color:#9fb8a8;font-size:10px;padding:4px 8px;letter-spacing:1px}\n#cmd-bar .slot b{color:#7dff8a;margin-right:6px}\n#log{position:absolute;bottom:0;left:0;right:0;height:110px;background:#0a0d10;border-top:2px solid #1e3a24;padding:6px 10px;font-size:12px;overflow-y:auto;line-height:1.5;z-index:5}
h2{font-size:15px;letter-spacing:2px}h3{color:#ffd75e;font-size:11px;letter-spacing:1px;margin-top:8px}
.stat{display:flex;justify-content:space-between;color:#9fb8a8}.stat b{color:#eaf5ff}
.bar-wrap{background:#11161b;border:1px solid #243;height:13px;position:relative;margin:2px 0 5px}
.bar-fill{height:100%}.bar-label{position:absolute;inset:0;font-size:10px;display:flex;align-items:center;justify-content:center;color:#eaf5ff;text-shadow:1px 1px 0 #000}
.ab-btn{display:block;width:100%;text-align:left;background:#101820;border:1px solid #2a4a5a;color:#cfe3c0;font-family:inherit;font-size:11px;padding:5px 8px;margin:3px 0;cursor:pointer}
.ab-btn:disabled{opacity:.4;cursor:default}.ab-btn .key{background:#233;color:#7df;padding:0 5px;border:1px solid #456;font-weight:bold}
.ab-btn small{color:#7d94a8;display:block}.ab-btn .cd{float:right;color:#7dff8a;font-weight:bold}
.modal-overlay{position:fixed;inset:0;background:rgba(3,6,8,.8);display:flex;align-items:center;justify-content:center;z-index:100}
.modal-box{background:#0c1418;border:2px solid #2f6b3a;padding:24px 28px;max-width:560px;font-size:13px}
.modal-box p{color:#cfe3c0;margin:10px 0;line-height:1.5}
.m-btn{display:block;width:100%;text-align:left;background:#12281a;border:2px solid #2f6b3a;color:#7dff8a;font-family:inherit;font-size:12px;padding:8px 10px;margin:6px 0;cursor:pointer}
.m-btn:disabled{opacity:.35;cursor:default}.m-hint{color:#5a7a68;font-size:10px;margin-top:6px}
/* CRT post-processing: scanlines + vignette + chromatic edge */
#crt{position:fixed;inset:0;pointer-events:none;z-index:60;background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px);mix-blend-mode:multiply}
#vig{position:fixed;inset:0;pointer-events:none;z-index:61;box-shadow:inset 0 0 180px rgba(0,0,0,.85)}
#flicker{position:fixed;inset:0;pointer-events:none;z-index:62;background:rgba(125,255,138,.02);animation:fl 4s steps(60) infinite}
@keyframes fl{0%,100%{opacity:.4}50%{opacity:.9}}`;
document.head.appendChild(css);
['crt', 'vig', 'flicker'].forEach(id => { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); });

// ---------- DOM skeleton ----------
document.body.insertAdjacentHTML('afterbegin', '<div id="wrap"><div id="side"></div><div id="main">' +
  '<canvas id="map" width="' + W + '" height="' + H + '"></canvas>' +
  '<canvas id="gl" width="' + W + '" height="' + H + '"></canvas>' +
  '<div id="cmd-bar"></div><div id="log"></div></div></div>');

const mapCv = document.getElementById('map') as HTMLCanvasElement;
const ctx = mapCv.getContext('2d')!;
const renderer = new Renderer(document.getElementById('gl') as HTMLCanvasElement);
const sideEl = document.getElementById('side') as HTMLElement;
const logEl = document.getElementById('log') as HTMLElement;
function log(t: string) { logEl.innerHTML += '<span style="color:#7dff8a">»</span> ' + t + '<br>'; logEl.scrollTop = logEl.scrollHeight; }

// ---------- state machine ----------
type Mode = 'title' | 'select' | 'game';
let mode: Mode = 'title';
let selIdx = 0;
let director: Director | null = null;
let deps: HudDeps | null = null;
let cinematic = false;

function boot(heroId: HeroId, restored: GameState | null): void {
  director = new Director(heroId);
  if (restored) { director.restore(restored); log('Save file loaded. The save file remembers.'); }
  const h = HEROES.find(x => x.id === heroId)!;
  deps = { heroId, heroColor: h.color, heroName: h.name, heroTitle: h.title };
  director.store.subscribe(s => { renderHUD(sideEl, s, deps!, director!.cds); save(s); });
  renderHUD(sideEl, director.s, deps, director.cds);
  const bar = document.getElementById('cmd-bar') as HTMLElement;
  const abs2 = OPS_ABILITIES[heroId];
  bar.innerHTML = '<div class="slot"><b>Q</b>' + abs2[0].name.split('\u2014')[0].trim() + '</div>' +
    '<div class="slot"><b>W</b>' + abs2[1].name.split('\u2014')[0].trim() + '</div>' +
    '<div class="slot" id="esc-menu" style="cursor:pointer"><b>ESC</b>MENU</div>';
  document.getElementById('esc-menu')!.onclick = () => { save(director!.s); location.reload(); };
  if (!restored) {
    log('Operation begins: ' + h.name + ' — ' + h.title);
    log('Reach DRILL 100% before the CASE FILE does. Click a connected node to travel.');
  }
  mode = 'game'; audio.startTheme();
}

function runItBack() {
  localStorage.removeItem(HERO_KEY);
  save({ powder: 40, clean: 30, heat: 10, drill: 14, kas: 12, rep: { sov: 40, jtf: 20, dock: 50, press: 30 }, node: 'bangkok', moves: 0, flags: {} });
  audio.stopTheme(); cinematic = false; director = null; mode = 'select'; audio.sfx('click');
}

// ---------- input ----------
addEventListener('keydown', e => {
  if (mode === 'title' && e.key === 'Enter') { mode = 'select'; audio.sfx('click'); return; }
  if (mode === 'title' && (e.key === 'i' || e.key === 'I')) { bootInvestigator(); return; }
  if (mode === 'select') {
    if (e.key === 'ArrowLeft') { selIdx = (selIdx + 2) % 3; audio.sfx('click'); }
    if (e.key === 'ArrowRight') { selIdx = (selIdx + 1) % 3; audio.sfx('click'); }
    if (e.key === 'Enter') { const id = HEROES[selIdx].id as HeroId; localStorage.setItem(HERO_KEY, id); boot(id, null); }
    return;
  }
  if (cinematic && e.key === 'Enter') { runItBack(); return; }
  if (!director || !deps) return;
  const ab = OPS_ABILITIES[deps.heroId].find(a => a.key.toLowerCase() === e.key.toLowerCase());
  if (ab) {
    const logs = director.useOpsAbility(ab.id);
    logs.forEach(log);
    if (logs.length && !logs[0].includes('cooldown')) audio.sfx('ability');
    director.store.dispatch({ type: 'FLAG', payload: { k: 'noop', v: true } });
  }
});
sideEl.addEventListener('click', e => {
  const t = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-ability]');
  if (t && !t.disabled && director && deps) {
    const logs = director.useOpsAbility(t.dataset.ability!);
    logs.forEach(log); if (logs.length && !logs[0].includes('cooldown')) audio.sfx('ability');
    director.store.dispatch({ type: 'FLAG', payload: { k: 'noop', v: true } });
  }
});
mapCv.addEventListener('click', e => {
  if (mode !== 'game' || !director || cinematic) return;
  const r = mapCv.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
  if (mode === 'select') { // v1.3: click photo panels — left ping, center black, right mariusz
    const pickIdx = x < 345 ? 0 : x < 615 ? 2 : 1;
    if (y > 40 && y < 460) { const h = HEROES[pickIdx]; localStorage.setItem(HERO_KEY, h.id); boot(h.id as HeroId, null); }
    return;
  }
  let best: typeof NODES[0] | null = null, bd = 1e9;
  NODES.forEach(n => { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = n; } });
  if (best && bd < 28 * 28 && director.canTravel(best.id)) doTravel(best.id);
});
function doTravel(id: string) {
  if (!director) return;
  const res = director.travel(id);
  res.logs.forEach(log);
  sfxForResult(audio, res);
  const n = nodeById(id);
  if (n.type === 'extract' || n.type === 'dig') spawnBurst(n.x, n.y, n.type === 'dig' ? '#ffd75e' : '#39ff6a');
  if (res.event) showEvent(res.event, i => { director!.resolveEvent(i).forEach(log); audio.sfx('click'); });
  if (res.raid) showRaid(director.s, m => { director!.resolveRaid(m).forEach(log); });
  if (res.battle) showBattleChoice(n.name, p => { director!.resolveBattle(p).forEach(log); });
  if (res.ending) playCinematic(res.ending);
}
function playCinematic(ending: string) {
  cinematic = true; audio.stopTheme();
  audio.sfx(ending === 'concrete-dawn' ? 'win' : 'lose');
  const win = ending === 'concrete-dawn';
  const lines = win
    ? ['CONCRETE DAWN', '', 'The drill breaks through.', 'DOWNSTAIRS opens for business.', '', 'The Earth at night, glowing as ever —', 'while underneath, the red lines light up one by one.']
    : ['BERTH 44', '', 'One verified chain, complete to the Sovereignty ledger.', 'Nine countries. One synchronized hour.', '', 'They are laughing as they read you your rights.', 'Kenji got his ending.'];
  showEnding(ending, director!.s, deps!.heroName, () => {});
  const box = document.querySelector('.modal-box') as HTMLElement;
  let i = 0;
  const crawl = setInterval(() => {
    if (i >= lines.length || !cinematic) { clearInterval(crawl); return; }
    if (i === 0) box.querySelector('h3')!.textContent = lines[0];
    else { const p = document.createElement('p'); p.textContent = lines[i]; p.style.opacity = '0'; box.insertBefore(p, box.querySelector('.m-btn')); requestAnimationFrame(() => { p.style.transition = 'opacity 1.2s'; p.style.opacity = '1'; }); }
    i++;
  }, 900);
}

// ---------- particles ----------
const parts: { x: number; y: number; vx: number; vy: number; life: number; c: [number, number, number] }[] = [];
function spawnBurst(x: number, y: number, hex: string) {
  const n = parseInt(hex.slice(1), 16);
  for (let i = 0; i < 16; i++) parts.push({ x, y, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3 - 1, life: 30, c: [n >> 16 & 255, n >> 8 & 255, n & 255] });
}

// ---------- render ----------
let T = 0, mx = -1, my = -1, heroPos = { x: 745, y: 310 };
mapCv.addEventListener('mousemove', e => { const r = mapCv.getBoundingClientRect(); mx = (e.clientX - r.left) * (W / r.width); my = (e.clientY - r.top) * (H / r.height); });
mapCv.addEventListener('mouseleave', () => { mx = -1; my = -1; });
const CONT = [[80,120],[100,120],[120,140],[140,160],[140,180],[160,200],[160,240],[180,260],[180,300],[160,340],[160,400],[180,440],[200,460],[180,480],[220,300],[240,320],[250,340],[235,372],[215,390],[250,420],[270,450],[250,470],[400,100],[420,100],[440,120],[460,140],[480,140],[500,160],[520,180],[540,180],[560,200],[580,220],[600,240],[460,280],[480,300],[500,320],[520,340],[540,360],[560,380],[580,400],[520,380],[540,400],[500,360],[600,300],[620,320],[640,180],[660,160],[680,180],[700,200],[720,220],[740,240],[760,260],[780,280],[760,300],[740,320],[720,340]];

function drawTitle() {
  ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) { ctx.fillStyle = 'rgba(200,255,220,' + ((i * 37) % 100) / 160 + ')'; ctx.fillRect((i * 173) % W, (i * 97) % H, 2, 2); }
  ctx.strokeStyle = 'rgba(57,255,106,.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(W / 2, H / 2 + 30, 150 + Math.sin(T / 40) * 4, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2 + 30, 110, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#39ff6a'; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -T;
  ctx.beginPath(); ctx.moveTo(W / 2 + 300, H / 2 + 10); ctx.quadraticCurveTo(W / 2, H / 2 - 120, W / 2 - 280, H / 2 + 60); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 42px Courier New'; ctx.textAlign = 'center';
  ctx.shadowColor = '#39ff6a'; ctx.shadowBlur = 18;
  ctx.fillText('SHADOW ROUTES', W / 2, 110); ctx.shadowBlur = 0;
  ctx.fillStyle = '#9fb8a8'; ctx.font = '16px Courier New';
  ctx.fillText('T H R E E   O C E A N   H E R O E S', W / 2, 140);
  ctx.fillStyle = '#3a7a52'; ctx.font = '13px Courier New';
  ctx.fillText('— 2026 EDITION · GLOBAL OPS GRID v1.0 —', W / 2, 160);
  ctx.fillStyle = '#5a7a68'; ctx.font = '12px Courier New';
  ctx.fillText('A documentary became a game. The save file does not care which one you came for.', W / 2, 182);
  ctx.fillStyle = (T % 40 < 20) ? '#ffd75e' : '#7a6420'; ctx.font = 'bold 18px Courier New';
  ctx.fillText('PRESS ENTER', W / 2, 500);
}
function drawSelect() {
  ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H);
  if (selImg.complete && selImg.naturalWidth > 0) ctx.drawImage(selImg, 0, 0, W, H);
  // photo panel zones (canvas x): left = MR PING, center = BLACKHUJUS, right = MERHUJUS
  const zone = [{ x: 60, w: 280 }, { x: 615, w: 280 }, { x: 345, w: 270 }]; // order: ping, mariusz, black
  const sel = HEROES[selIdx];
  const z = zone[selIdx];
  ctx.strokeStyle = sel.color; ctx.lineWidth = 3;
  ctx.shadowColor = sel.color; ctx.shadowBlur = 16;
  ctx.strokeRect(z.x, 40, z.w, 400); ctx.shadowBlur = 0;
  ctx.fillStyle = sel.color; ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'center';
  ctx.fillText('▶ ' + sel.name + ' — ' + sel.region, W / 2, 480);
  ctx.fillStyle = (T % 40 < 20) ? '#ffd75e' : '#7a6420'; ctx.font = 'bold 13px Courier New';
  ctx.fillText('← → ARROWS · CLICK A LEADER · ENTER = ANSWER', W / 2, 522);
}
function wrapText(t: string, x: number, y: number, maxW: number, lh: number) {
  const words = t.split(' '); let line = '', yy = y;
  words.forEach(w => { if (ctx.measureText(line + w).width > maxW) { ctx.fillText(line, x, yy); yy += lh; line = w + ' '; } else line += w + ' '; });
  ctx.fillText(line, x, yy);
}
function drawToken(ox: number, oy: number, heroId: string, px: number) {
  const h = HEROES.find(x => x.id === heroId)!;
  const pal: Record<string, string> = { K: '#16181c', W: '#f2e6d5', B: '#111', R: h.color, S: '#8a8f98' };
  const bob = Math.sin(T / 8) > 0 ? 1 : 0;
  const SPR = ['..KKKKKKKK..','.KWWKKKKWWK.','.KWBKKKKWBK.','..KKKKKKKK..','...KKKKKK...','..KRRRRRRK..','.KKKKKKKKKK.','.KKSKKKKSKK.','..KKKKKKKK..','..KKK..KKK..','..KK....KK..','............','............','............'];
  SPR.forEach((row, ry) => { for (let cx = 0; cx < row.length; cx++) { const ch = row[cx]; if (ch === '.') continue; ctx.fillStyle = pal[ch]; ctx.fillRect(ox + cx * px, oy + (ry + bob) * px, px, px); } });
}
function drawMap() {
  if (mapImg.complete && mapImg.naturalWidth > 0) {
    ctx.drawImage(mapImg, 0, 0, W, H);
    ctx.fillStyle = 'rgba(4,8,14,.38)'; ctx.fillRect(0, 0, W, H); // readability scrim
  } else {
    ctx.fillStyle = '#07131c'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(40,80,90,.25)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = '#0e2418'; CONT.forEach(p => ctx.fillRect(p[0], p[1], 20, 20));
  }
  const node = director ? director.s.node : (inv ? inv.s.node : null);
  const pulse = 0.5 + 0.5 * Math.sin(T / 20);
  EDGES.forEach(([a, b]) => {
    const A = nodeById(a), B = nodeById(b);
    const lit = node && (a === node || b === node);
    ctx.strokeStyle = lit ? 'rgba(57,255,106,' + (0.5 + 0.4 * pulse) + ')' : 'rgba(90,140,110,.35)';
    ctx.lineWidth = lit ? 3 : 2; ctx.setLineDash(lit ? [8, 6] : [4, 8]); ctx.lineDashOffset = -T / 2;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  });
  ctx.setLineDash([]);
  let hover: typeof NODES[0] | null = null, hd = 1e9;
  NODES.forEach(n => {
    const cur = n.id === node, adjN = director && neighbors(node!).includes(n.id);
    const col = { asia: '#39ff6a', europe: '#5eb2ff', americas: '#b46bff' }[n.region];
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(n.x, n.y, cur ? 9 : 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#05070a'; ctx.beginPath(); ctx.arc(n.x, n.y, 3, 0, 7); ctx.fill();
    if (adjN) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.strokeRect(n.x - 11, n.y - 11, 22, 22); }
    ctx.fillStyle = cur ? '#fff' : '#9fb8a8'; ctx.font = '11px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(n.name.toUpperCase(), n.x, n.y - 16);
    ctx.fillStyle = col; ctx.font = '9px Courier New'; ctx.fillText(n.type.toUpperCase(), n.x, n.y + 22);
  });
  if (mx >= 0) NODES.forEach(n => { const d = (n.x - mx) ** 2 + (n.y - my) ** 2; if (d < hd) { hd = d; hover = n; } });
  if (hover && hd < 30 * 30) {
    ctx.fillStyle = 'rgba(8,14,10,.92)'; ctx.fillRect(W - 330, H - 84, 320, 74);
    ctx.strokeStyle = '#2f6b3a'; ctx.strokeRect(W - 330, H - 84, 320, 74);
    ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(hover.name.toUpperCase(), W - 318, H - 64);
    ctx.fillStyle = '#9fb8a8'; ctx.font = '10px Courier New';
    wrapText(hover.desc, W - 318, H - 48, 296, 12);
  }
  ctx.fillStyle = 'rgba(8,14,10,.85)'; ctx.fillRect(10, 10, 356, 26);
  ctx.strokeStyle = '#1e3a24'; ctx.strokeRect(10, 10, 356, 26);
  ctx.fillStyle = '#39ff6a'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'left';
  ctx.fillText('◉ OPERATION SHADOW ROUTES — LIVE OPS GRID · 2026 · T+' + Math.floor(T / 60), 18, 27);
  if (director && director.s.heat > 60) { ctx.fillStyle = 'rgba(255,40,40,' + ((director.s.heat - 60) / 400) + ')'; ctx.fillRect(0, 0, W, H); }
}

// auto-resume: if a save + hero exist, skip to game (title still reachable via Run It Back)
const savedHero = localStorage.getItem(HERO_KEY) as HeroId | null;
const savedState = load();
if (savedHero && savedState && savedState.moves > 0) boot(savedHero, savedState);

function loop() {
  T++;
  if (mode === 'title') drawTitle();
  else if (mode === 'select') drawSelect();
  else {
    drawMap();
    if (director) {
      const n = nodeById(director.s.node);
      heroPos.x += (n.x - heroPos.x) * 0.12; heroPos.y += (n.y - heroPos.y) * 0.12;
    }
    if (deps) drawToken(heroPos.x - 18, heroPos.y - 24, deps.heroId, 3);
  }
  const lights: Light[] = [];
  if (director && mode === 'game') {
    const heatL = director.s.heat / 100;
    lights.push({ x: heroPos.x, y: heroPos.y, radius: 120, color: [0.4 + heatL, 0.9 - heatL * 0.5, 0.5] });
    if (director.s.heat > 50) lights.push({ x: W / 2, y: 40, radius: 200 + Math.sin(T / 10) * 30, color: [0.9, 0.15, 0.15] });
  }
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.life--; if (p.life <= 0) { parts.splice(i, 1); continue; } renderer.sprite(p.x, p.y, 3, 3, p.c[0] / 255, p.c[1] / 255, p.c[2] / 255, p.life / 30); }
  renderer.flush(lights, mode === 'game' ? 0.5 : 0.25);
  requestAnimationFrame(loop);
}
// ---------- investigator mode (Episode Six) ----------
let inv: Investigator | null = null;
function bootInvestigator(): void {
  inv = new Investigator();
  director = null; mode = 'game'; audio.startTheme();
  log('EPISODE SIX — You are the Investigator. Opened at Berth 44.');
  log('Reach CASE 100% before the DRILL does. Click adjacent nodes to investigate. Warrants: ' + inv.warrants);
}
mapCv.addEventListener('click', e => {
  if (!inv || inv.ending) return;
  const r = mapCv.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
  let best: typeof NODES[0] | null = null, bd = 1e9;
  NODES.forEach(n => { const d2 = (n.x - x) ** 2 + (n.y - y) ** 2; if (d2 < bd) { bd = d2; best = n; } });
  if (best && bd < 28 * 28 && inv.canInvestigate(best.id)) {
    inv.investigate(best.id).forEach(log);
    audio.sfx('move');
    heroPos = { x: nodeById(inv.s.node).x, y: nodeById(inv.s.node).y };
    log('CASE ' + inv.s.kas + '% · DRILL ' + inv.s.drill + '% · WARRANTS ' + inv.warrants);
    if (inv.ending === 'case-closed') { audio.sfx('win'); showEnding('case-closed', inv.s, 'INVESTIGATOR KENJI', () => { inv = null; mode = 'title'; }); }
    if (inv.ending === 'concrete-dawn') { audio.sfx('lose'); showEnding('concrete-dawn', inv.s, 'INVESTIGATOR KENJI', () => { inv = null; mode = 'title'; }); }
  }
});
loop();
