// World graph — 2026 Global Ops Grid. Canon node set from the v2.0 map (Port of Rotterdam,
// Kraków, Hyderabad, Mombasa, Port of Nigeria, Mexico City, Playa Blanca · Cartagena, Puerto Rico).
import { Action } from '../store/gameStore';

export type Region = 'asia' | 'europe' | 'americas';
export type NodeType = 'extract' | 'transit' | 'launder' | 'dig';
export interface WorldNode { id: string; name: string; x: number; y: number; region: Region; type: NodeType; desc: string }

export const NODES: WorldNode[] = [
  { id:'jungle', name:'Jungle Camp',        x:758, y:235, region:'asia',     type:'extract', desc:'THE SOURCE — Vietnam–Cambodia border. Extraction zone.' },
  { id:'bangkok',name:'Bangkok Hub',        x:710, y:263, region:'asia',     type:'extract', desc:'THE HUB — transit city. Decoys & casinos.' },
  { id:'pattaya',name:'Pattaya',            x:691, y:297, region:'asia',     type:'extract', desc:'Dummy seizures staged on schedule.' },
  { id:'chitta', name:'Chittagong',         x:643, y:224, region:'asia',     type:'extract', desc:'Port officials paid in bearer bonds.' },
  { id:'hydra',  name:'Hyderabad',          x:614, y:274, region:'asia',     type:'extract', desc:'Deccan Plateau relay. Pharma fronts, night convoys.' },
  { id:'batumi', name:'Batumi',             x:480, y:157, region:'europe',   type:'transit', desc:'THE EYE OF THE NEEDLE — rain-black port of Georgia.' },
  { id:'bialy',  name:'Białystok',          x:490, y:129, region:'europe',   type:'transit', desc:'4 a.m. truck stops. Welders seal the castings.' },
  { id:'krakow', name:'Kraków',             x:509, y:140, region:'europe',   type:'transit', desc:'A2/A4 corridor — the southern spoke of the Iron Fleet.' },
  { id:'warsaw', name:'Warsaw',             x:461, y:134, region:'europe',   type:'transit', desc:'Eleven-minute border crossings, paid in crypto.' },
  { id:'berth',  name:'Port of Rotterdam',  x:432, y:106, region:'europe',   type:'transit', desc:'BERTH 44 — 8M containers a year. Manifest edits itself.' },
  { id:'boston', name:'Boston',             x:230, y:146, region:'americas', type:'launder', desc:'Never a market — an invoice.' },
  { id:'artery', name:'The Artery',         x:182, y:202, region:'americas', type:'dig',     desc:'Mexico–USA tunnel. Drill head hungry for clean money.' },
  { id:'mexico', name:'Mexico City',        x:192, y:224, region:'americas', type:'launder', desc:'Capital laundry grid washing the drilling payroll.' },
  { id:'cartag', name:'Playa Blanca · Cartagena', x:221, y:269, region:'americas', type:'launder', desc:'Caribbean coves. Emerald dust in tourist coolers.' },
  { id:'puerto', name:'Puerto Rico',        x:250, y:235, region:'americas', type:'launder', desc:'US-flag paperwork, offshore patience.' },
  { id:'rio',    name:'Rio de Janeiro',     x:240, y:364, region:'americas', type:'launder', desc:'Laundries. Art auctions. The Imperator\u2019s weather.' },
  { id:'lagos',  name:'Port of Nigeria · Lagos', x:403, y:274, region:'americas', type:'launder', desc:'Chemical markets of Africa. Enforcement on retainer.' },
  { id:'mombasa',name:'Port of Mombasa',    x:509, y:325, region:'americas', type:'launder', desc:'Swahili coast gateway. 2% scanned, 100% paid.' },
];

export const EDGES: [string, string][] = [
  ['jungle','bangkok'],['bangkok','pattaya'],['bangkok','chitta'],['chitta','hydra'],
  ['hydra','batumi'],['chitta','batumi'],
  ['batumi','bialy'],['bialy','warsaw'],['batumi','krakow'],['krakow','warsaw'],['warsaw','berth'],
  ['berth','boston'],['boston','artery'],['artery','mexico'],['mexico','boston'],
  ['boston','puerto'],['puerto','cartag'],['cartag','rio'],['rio','lagos'],['lagos','mombasa'],
  ['mombasa','batumi'],['lagos','batumi'],
];

export const adjacency: Record<string, string[]> = (() => {
  const adj: Record<string, string[]> = {};
  NODES.forEach(n => adj[n.id] = []);
  EDGES.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  return adj;
})();
export const neighbors = (id: string): string[] => adjacency[id] || [];
export const nodeById = (id: string): WorldNode => NODES.find(n => n.id === id)!;
export const isConnected = (a: string, b: string): boolean => neighbors(a).includes(b);

/** Field events — Episode Six "evidence pool". Effects return store Actions (pure, testable). */
export interface GameEvent {
  id: string; text: string; image?: string;
  choices: { label: string; apply: () => Action[] }[];
}
export const EVENT_POOL: GameEvent[] = [
  { id:'manifest-joke', text:'A Bangkok lieutenant wants the manifest joke reinstated. "It was FUNNY," he insists.',
    choices:[
      { label:'Allow it (Dockside +8, Heat +8, Case +3)', apply: () => [{type:'REP',payload:{k:'dock',v:8}},{type:'HEAT',payload:8},{type:'CASE_UP',payload:3}] },
      { label:'Forbid it (Sovereignty +6, Dockside -4)', apply: () => [{type:'REP',payload:{k:'sov',v:6}},{type:'REP',payload:{k:'dock',v:-4}}] } ] },
  { id:'colonel-decoy', text:'Colonel Chalerm requests a "record seizure" for the cameras this week.',
    choices:[
      { label:'Feed him a decoy (Heat -8, Fourth Estate +5)', apply: () => [{type:'HEAT',payload:-8},{type:'REP',payload:{k:'press',v:5}}] },
      { label:'Refuse (Heat +8, Case +4)', apply: () => [{type:'HEAT',payload:8},{type:'CASE_UP',payload:4}] } ] },
  { id:'wedding', text:'Waldemar invites you to a family wedding. Scientists would study the footage.',
    choices:[
      { label:'Send an anonymous gift (Case -4)', apply: () => [{type:'CASE_UP',payload:-4}] },
      { label:'Decline — weddings are a paperwork error (Sovereignty +4)', apply: () => [{type:'REP',payload:{k:'sov',v:4}}] } ] },
  { id:'courier', text:'A Chittagong courier saw the containers glow. He wants hazard pay. Or else.',
    choices:[
      { label:'Pay him (Clean -15, Case -3)', apply: () => [{type:'CLEAN',payload:-15},{type:'CASE_UP',payload:-3}] },
      { label:'Make an example (Heat -4, Press -8, Sovereignty +6)', apply: () => [{type:'HEAT',payload:-4},{type:'REP',payload:{k:'press',v:-8}},{type:'REP',payload:{k:'sov',v:6}}] } ] },
  { id:'omega', text:'Agent "Omega" is poking around a Rio ledger office. One call could misdirect her.',
    choices:[
      { label:'Burn a shell company (Clean -20, Case -6)', apply: () => [{type:'CLEAN',payload:-20},{type:'CASE_UP',payload:-6}] },
      { label:'Do nothing (Case +6)', apply: () => [{type:'CASE_UP',payload:6}] } ] },
  { id:'berth-bonus', text:'Dock workers at Berth 44 demand a "shift bonus" before your container lands.',
    choices:[
      { label:'Pay the Dockside (Clean -12, Dockside +10)', apply: () => [{type:'CLEAN',payload:-12},{type:'REP',payload:{k:'dock',v:10}}] },
      { label:'Squeeze them (Dockside -12, Clean +8)', apply: () => [{type:'REP',payload:{k:'dock',v:-12}},{type:'CLEAN',payload:8}] } ] },
  ,
  { id:'mr-bannny', image:'assets/event-vlogger.png',
    text:'A travel vlogger in a bunny hat is livestreaming outside the safehouse. Two million viewers. The algorithm loves him. Somehow, none of them see the container yard behind him.',
    choices:[
      { label:'Let him vlog (Case -6, Fourth Estate -10 — his fans "debunk" the investigation)', apply: () => [{type:'CASE_UP',payload:-6},{type:'REP',payload:{k:'press',v:-10}}] },
      { label:'Buy his silence (Clean -25, Case -3)', apply: () => [{type:'CLEAN',payload:-25},{type:'CASE_UP',payload:-3}] } ] },
];
