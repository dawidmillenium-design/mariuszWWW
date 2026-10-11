// Operator abilities (Q/W) — the economy powers from Episode Six, as engine data.
import type { HeroId } from './director';
export interface OpsAbility { id: string; key: 'Q' | 'W'; name: string; cd: number; desc: string }
export const OPS_ABILITIES: Record<HeroId, OpsAbility[]> = {
  ping: [
    { id:'laugh', key:'Q', name:'YA! YA! YA! — Golden Laugh', cd:3, desc:'-12 Heat, +10 Dockside, -4 Case (they laugh too).' },
    { id:'decoy', key:'W', name:'Decoy Seizure',              cd:5, desc:'-10 Heat, +3 Case. Next raid hits a decoy and fails.' } ],
  mariusz: [
    { id:'ghost',      key:'Q', name:'Ghost Fleet',     cd:4, desc:'2 moves generate zero Heat (boredom is camouflage).' },
    { id:'paperwork',  key:'W', name:'Paperwork Armor', cd:6, desc:'Next 2 raids auto-fail. Correct weight, correct seals.' } ],
  black: [
    { id:'downstairs', key:'Q', name:'DOWNSTAIRS',   cd:5, desc:'-18 Heat, +8 Sovereignty. Case gains halved for 3 moves.' },
    { id:'blackbudget',key:'W', name:'Black Budget', cd:6, desc:'Next node action yields DOUBLE.' } ]
};
