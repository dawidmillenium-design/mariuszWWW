// Canon hero data — source of truth: scenario/Shadow Routes - Complete Seven-Episode Scenario.md
export type Region = 'asia' | 'europe' | 'americas';
export interface AbilityDef {
  id: string; name: string; apCost: number; power: number; range: number; aoe?: number;
  kind: 'strike' | 'tech' | 'burst'; flavor: string;
}
export interface HeroDef {
  id: 'ping' | 'mariusz' | 'black';
  name: string; title: string; region: Region; color: string;
  maxHp: number; maxAp: number; moveCost: number; // AP per tile
  abilities: AbilityDef[];
}
export const HEROES: HeroDef[] = [
  { id:'ping', name:'YAYAYAhujUS', title:'The Laughing Node', region:'asia', color:'#ff5e5e',
    maxHp:90, maxAp:5, moveCost:1,
    abilities:[
      {id:'laugh',   name:'YA! YA! YA!',      apCost:2, power:12, range:3, aoe:1, kind:'burst', flavor:'Three bright syllables. Everyone in the room is disarmed.'},
      {id:'decoy',   name:'Decoy Shipment',    apCost:3, power:0,  range:4,        kind:'tech',  flavor:'They seize flour and pride. Next attack against an ally fizzles.'},
      {id:'shiv',    name:'Funeral Smile',     apCost:2, power:18, range:1,        kind:'strike',flavor:'He laughed at the wrong funeral once.'}
    ]},
  { id:'mariusz', name:'MERhujUS', title:'The Iron Fleet', region:'europe', color:'#5eb2ff',
    maxHp:130, maxAp:4, moveCost:1,
    abilities:[
      {id:'ram',       name:'Bumper Draft',     apCost:3, power:24, range:1,        kind:'strike',flavor:'Forty tonnes of schedule with a grudge.'},
      {id:'paperwork', name:'Paperwork Armor',  apCost:2, power:0,  range:0,        kind:'tech',  flavor:'Correct weight. Correct seals. Damage shield for 2 turns.'},
      {id:'taser',     name:'Customs Inspection',apCost:2, power:14, range:2,       kind:'strike',flavor:'Eleven-minute crossing. You were the delay.'}
    ]},
  { id:'black', name:'BLACKHUJUS', title:'The Black Sovereign', region:'americas', color:'#b46bff',
    maxHp:160, maxAp:3, moveCost:2,
    abilities:[
      {id:'downstairs', name:'DOWNSTAIRS',      apCost:3, power:30, range:1, aoe:1, kind:'burst', flavor:'You do not negotiate with weather.'},
      {id:'budget',     name:'Black Budget',    apCost:1, power:0,  range:0,        kind:'tech',  flavor:'Next ability costs 0 AP and deals double.'},
      {id:'suppress',   name:'Enforcement Crew',apCost:2, power:16, range:3,        kind:'strike',flavor:'Quotas met. Pray it stays sunny.'}
    ]}
];
export const heroById = (id: string) => HEROES.find(h => h.id === id)!;
