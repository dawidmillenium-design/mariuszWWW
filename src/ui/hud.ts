// Typed DOM HUD — side panel. Pure render function: state in, HTML out. Zero dependencies.
import { GameState } from '../store/gameStore';
import { HeroId } from '../game/director';
import { OPS_ABILITIES } from '../game/abilities';
import { HEROES } from '../data/heroes';

export interface HudDeps { heroId: HeroId; heroColor: string; heroName: string; heroTitle: string }
const bar = (v: number, color: string) =>
  '<div class="bar-wrap"><div class="bar-fill" style="width:' + v + '%;background:repeating-linear-gradient(90deg,' + color + ' 0 8px,transparent 8px 10px) + '"></div>' +
  '<div class="bar-label">' + v + '</div></div>';


function bossesBlock(activeId: string): string {
  const skull = String.fromCodePoint(0x1F480);
  return '<h3 style="margin-top:0">SYNDICATE BOSSES</h3>' + HEROES.map(h =>
    '<div style="border:1px solid ' + (h.id === activeId ? h.color : '#243') + ';padding:4px 6px;margin:3px 0;' +
    (h.id === activeId ? 'background:rgba(125,255,138,.05)' : 'opacity:.75') + '">' +
    '<b style="color:' + h.color + ';font-size:11px">' + h.name + '</b>' +
    '<span style="float:right;color:#9fb8a8;font-size:9px">' + h.region + '</span>' +
    '<div style="color:#7d94a8;font-size:9px">' + h.title + '</div>' +
    '<div style="color:' + h.color + ';letter-spacing:2px;font-size:9px">' + skull.repeat(5) + '</div></div>').join('');
}
export function renderHUD(el: HTMLElement, s: GameState, deps: HudDeps, cds: Record<string, number>): void {
  const reps: [string, string, string][] = [['sov','Sovereignty','#b46bff'],['jtf','Joint Task Force','#5eb2ff'],['dock','The Dockside','#ffb35e'],['press','Fourth Estate','#7dff8a']];
  el.innerHTML =
    bossesBlock(deps.heroId) +
    '<h2 style="color:' + deps.heroColor + '">' + deps.heroName + '</h2>' +
    '<div style="color:#7d94a8;font-size:10px;margin-bottom:6px">' + deps.heroTitle + '</div>' +
    '<div class="stat"><span>POWDER</span><b>' + s.powder + '</b></div>' +
    '<div class="stat"><span>CLEAN FUNDS</span><b>$' + s.clean + '</b></div>' +
    '<div class="stat"><span>HEAT</span><b>' + s.heat + '</b></div>' +
    '<div class="stat"><span>DRILL</span><b style="color:#ffd75e">' + s.drill + '%</b></div>' +
    '<div class="stat"><span>CASE FILE</span><b style="color:#ff5050">' + s.kas + '%</b></div>' +
    '<h3>FACTION STANDING</h3>' +
    reps.map(([k, label, c]) => '<div class="stat"><span>' + label + '</span></div>' + bar(s.rep[k as keyof GameState['rep']], c)).join('') +
    '<h3>ABILITIES</h3>' +
    OPS_ABILITIES[deps.heroId].map(a => {
      const cd = cds[a.id] || 0;
      return '<button class="ab-btn" data-ability="' + a.id + '"' + (cd > 0 ? ' disabled' : '') + '>' +
        '<span class="key">' + a.key + '</span> <b style="color:' + deps.heroColor + '">' + a.name.split('—')[0] + '</b> ' +
        '<small>' + a.desc + '</small>' +
        '<span class="cd">' + (cd > 0 ? cd + 't' : 'RDY') + '</span></button>';
    }).join('') +
    '<div style="color:#5a7a68;font-size:10px;margin-top:auto">CLICK node = travel · Q/W = abilities</div>';
}
