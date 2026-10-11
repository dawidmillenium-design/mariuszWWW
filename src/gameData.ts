import { GameNode, Edge, NPC, TransportInfo, TransportMode } from './types';

// ═══════════════════════════════════════════════════════════════
// WORLD NODES — The Green Route
// ═══════════════════════════════════════════════════════════════

export const NODES: GameNode[] = [
  {
    id: 'vn_kh', name: 'VN–KH Border (Bavet/Moc Bai)', shortName: 'VN–KH',
    type: 'origin', region: 'SE Asia', x: 73, y: 54,
    baseBribeCost: 500, priceIndex: 0, buyPrice: 2000,
    description: 'Dense jungle trails. The cheapest raw compound on earth. Lowest security, highest volume.',
    npcDomain: 'yayaya',
  },
  {
    id: 'bangkok', name: 'Bangkok', shortName: 'BKK',
    type: 'hub', region: 'Thailand', x: 69, y: 50,
    baseBribeCost: 2000, priceIndex: 9000, buyPrice: 0,
    description: 'Neon-lit transit hub. First safe house. First conversion. YAYAYAhujUS\'s home turf.',
    npcDomain: 'yayaya',
  },
  {
    id: 'pattaya', name: 'Pattaya', shortName: 'PTY',
    type: 'market', region: 'Thailand', x: 71, y: 53,
    baseBribeCost: 800, priceIndex: 9000, buyPrice: 0,
    description: 'Coastal destination. Short run, low payout, very low risk. Tutorial-grade revenue.',
    npcDomain: 'yayaya',
  },
  {
    id: 'chittagong', name: 'Chittagong', shortName: 'CTG',
    type: 'port', region: 'Bangladesh', x: 64, y: 47,
    baseBribeCost: 1500, priceIndex: 10000, buyPrice: 0,
    description: 'Congested sea leg hub. Delays are common. Weather events frequent.',
  },
  {
    id: 'mumbai', name: 'Mumbai', shortName: 'BOM',
    type: 'hub', region: 'India', x: 58, y: 49,
    baseBribeCost: 2500, priceIndex: 11000, buyPrice: 0,
    description: 'Big safe house. Cheap conversion labor. Heat-sensitive — things go wrong fast here.',
    npcDomain: 'yayaya',
  },
  {
    id: 'bandar_abbas', name: 'Bandar Abbas', shortName: 'BND',
    type: 'port', region: 'Iran', x: 51, y: 44,
    baseBribeCost: 3000, priceIndex: 13000, buyPrice: 0,
    description: 'Bribe economy. Land bridge between East and West. Naval patrol corridor nearby.',
  },
  {
    id: 'istanbul', name: 'Istanbul', shortName: 'IST',
    type: 'market', region: 'Turkey', x: 45, y: 39,
    baseBribeCost: 2000, priceIndex: 14000, buyPrice: 0,
    description: 'Bridge between continents. Mid payout. Opens a second EU door.',
  },
  {
    id: 'batumi', name: 'Batumi', shortName: 'BAT',
    type: 'port', region: 'Georgia', x: 48, y: 37,
    baseBribeCost: 1800, priceIndex: 15000, buyPrice: 0,
    description: 'Free-port. Corruption discount. The famous "Batumi shuffle." Gateway to Black Sea.',
  },
  {
    id: 'odesa', name: 'Odesa', shortName: 'ODS',
    type: 'transit', region: 'Ukraine', x: 44, y: 35,
    baseBribeCost: 2500, priceIndex: 16000, buyPrice: 0,
    description: 'War-risk modifier zone. Cheap, chaotic, volatile events. Black Sea crossing.',
  },
  {
    id: 'bialystok', name: 'Białystok', shortName: 'BIA',
    type: 'hub', region: 'Poland', x: 41, y: 31,
    baseBribeCost: 4000, priceIndex: 18000, buyPrice: 0,
    description: 'EU border crossing — the single highest-risk land leg. The Wall.',
    npcDomain: 'mariusz',
  },
  {
    id: 'rotterdam', name: 'Rotterdam', shortName: 'RTM',
    type: 'port', region: 'Netherlands', x: 36, y: 29,
    baseBribeCost: 3500, priceIndex: 22000, buyPrice: 0,
    description: 'Mariusz\'s kingdom. Container injection into western shipping. Europe\'s largest port.',
    npcDomain: 'mariusz',
  },
  {
    id: 'boston', name: 'Boston', shortName: 'BOS',
    type: 'market', region: 'USA', x: 22, y: 32,
    baseBribeCost: 5000, priceIndex: 26000, buyPrice: 0,
    description: 'Primary end market. Highest Price Index. The American dream — at a price.',
  },
  {
    id: 'rio', name: 'Rio de Janeiro', shortName: 'RIO',
    type: 'market', region: 'Brazil', x: 28, y: 68,
    baseBribeCost: 3000, priceIndex: 18000, buyPrice: 0,
    description: 'South American hub. Long sea leg, pays in bulk. 15% tribute to BLACKHUJUS.',
    npcDomain: 'blackhujus',
  },
];

// ═══════════════════════════════════════════════════════════════
// EDGES — Route Network
// ═══════════════════════════════════════════════════════════════

export const EDGES: Edge[] = [
  { id: 'e1', from: 'vn_kh', to: 'bangkok', mode: 'motorbike', baseRisk: 8, baseHours: 6, costPerKg: 40, description: 'Jungle roads, patrol RNG' },
  { id: 'e2', from: 'bangkok', to: 'pattaya', mode: 'pickup', baseRisk: 4, baseHours: 3, costPerKg: 25, description: 'Coastal highway — tutorial run' },
  { id: 'e3', from: 'bangkok', to: 'chittagong', mode: 'freighter', baseRisk: 12, baseHours: 18, costPerKg: 12, description: 'Bay of Bengal crossing' },
  { id: 'e4', from: 'chittagong', to: 'mumbai', mode: 'freighter', baseRisk: 14, baseHours: 24, costPerKg: 12, description: 'Congestion queue, Indian Ocean' },
  { id: 'e5', from: 'mumbai', to: 'bandar_abbas', mode: 'freighter', baseRisk: 16, baseHours: 30, costPerKg: 12, description: 'Naval patrol corridor, Arabian Sea' },
  { id: 'e6', from: 'bandar_abbas', to: 'batumi', mode: 'tir_truck', baseRisk: 18, baseHours: 36, costPerKg: 18, description: 'Caucasus mountain passes' },
  { id: 'e7', from: 'bandar_abbas', to: 'istanbul', mode: 'tir_truck', baseRisk: 15, baseHours: 30, costPerKg: 18, description: 'Eastern Turkey land bridge' },
  { id: 'e8', from: 'batumi', to: 'odesa', mode: 'freighter', baseRisk: 15, baseHours: 12, costPerKg: 12, description: 'Black Sea short hop' },
  { id: 'e9', from: 'odesa', to: 'bialystok', mode: 'tir_truck', baseRisk: 30, baseHours: 24, costPerKg: 18, description: 'EU external border — THE WALL' },
  { id: 'e10', from: 'bianystok_alt', to: 'rotterdam', mode: 'tir_truck', baseRisk: 12, baseHours: 18, costPerKg: 18, description: 'Inside Schengen — risk drops' },
  { id: 'e11', from: 'bianystok_alt', to: 'rotterdam', mode: 'tir_truck', baseRisk: 12, baseHours: 18, costPerKg: 18, description: 'Inside Schengen — risk drops' },
  { id: 'e12', from: 'rotterdam', to: 'boston', mode: 'ocean_container', baseRisk: 22, baseHours: 96, costPerKg: 6, description: 'Transatlantic container — customs scan lottery' },
  { id: 'e13', from: 'batumi', to: 'rio', mode: 'freighter', baseRisk: 25, baseHours: 120, costPerKg: 12, description: 'Transatlantic to South America' },
  { id: 'e14', from: 'istanbul', to: 'batumi', mode: 'freighter', baseRisk: 10, baseHours: 18, costPerKg: 12, description: 'Black Sea ferry' },
  { id: 'e15', from: 'bianystok_alt', to: 'rotterdam', mode: 'tir_truck', baseRisk: 12, baseHours: 18, costPerKg: 18, description: 'Through Western Europe' },
];

// Fix edge IDs - proper edges
export const ROUTES: Edge[] = [
  { id: 'r_vn_bkk', from: 'vn_kh', to: 'bangkok', mode: 'motorbike', baseRisk: 8, baseHours: 6, costPerKg: 40, description: 'Jungle roads, patrol RNG' },
  { id: 'r_bkk_pty', from: 'bangkok', to: 'pattaya', mode: 'pickup', baseRisk: 4, baseHours: 3, costPerKg: 25, description: 'Coastal highway — tutorial run' },
  { id: 'r_bkk_ctg', from: 'bangkok', to: 'chittagong', mode: 'freighter', baseRisk: 12, baseHours: 18, costPerKg: 12, description: 'Bay of Bengal crossing' },
  { id: 'r_ctg_bom', from: 'chittagong', to: 'mumbai', mode: 'freighter', baseRisk: 14, baseHours: 24, costPerKg: 12, description: 'Congestion queue, Indian Ocean' },
  { id: 'r_bom_bnd', from: 'mumbai', to: 'bandar_abbas', mode: 'freighter', baseRisk: 16, baseHours: 30, costPerKg: 12, description: 'Naval patrol corridor, Arabian Sea' },
  { id: 'r_bnd_bat', from: 'bandar_abbas', to: 'batumi', mode: 'tir_truck', baseRisk: 18, baseHours: 36, costPerKg: 18, description: 'Caucasus mountain passes' },
  { id: 'r_bnd_ist', from: 'bandar_abbas', to: 'istanbul', mode: 'tir_truck', baseRisk: 15, baseHours: 30, costPerKg: 18, description: 'Eastern Turkey land bridge' },
  { id: 'r_bat_ods', from: 'batumi', to: 'odesa', mode: 'freighter', baseRisk: 15, baseHours: 12, costPerKg: 12, description: 'Black Sea short hop' },
  { id: 'r_ods_bia', from: 'odesa', to: 'bialystok', mode: 'tir_truck', baseRisk: 30, baseHours: 24, costPerKg: 18, description: 'EU external border — THE WALL' },
  { id: 'r_bia_rtm', from: 'bialystok', to: 'rotterdam', mode: 'tir_truck', baseRisk: 12, baseHours: 18, costPerKg: 18, description: 'Inside Schengen — risk drops' },
  { id: 'r_rtm_bos', from: 'rotterdam', to: 'boston', mode: 'ocean_container', baseRisk: 22, baseHours: 96, costPerKg: 6, description: 'Transatlantic — customs scan lottery' },
  { id: 'r_bat_rio', from: 'batumi', to: 'rio', mode: 'freighter', baseRisk: 25, baseHours: 120, costPerKg: 12, description: 'Transatlantic to South America' },
  { id: 'r_ist_bat', from: 'istanbul', to: 'batumi', mode: 'freighter', baseRisk: 10, baseHours: 18, costPerKg: 12, description: 'Black Sea ferry' },
  { id: 'r_ist_rtm', from: 'istanbul', to: 'rotterdam', mode: 'tir_truck', baseRisk: 14, baseHours: 48, costPerKg: 18, description: 'Through Balkans to Western Europe' },
];

// ═══════════════════════════════════════════════════════════════
// TRANSPORT MODES
// ═══════════════════════════════════════════════════════════════

export const TRANSPORT: Record<TransportMode, TransportInfo> = {
  motorbike: { mode: 'motorbike', label: 'Motorbike Courier', icon: '🏍️', capacity: 5, speed: 2.0, concealment: 8, costPerKgPerLeg: 40 },
  pickup: { mode: 'pickup', label: 'Pickup/Van', icon: '🚐', capacity: 40, speed: 1.8, concealment: 5, costPerKgPerLeg: 25 },
  freighter: { mode: 'freighter', label: 'Small Freighter', icon: '🚢', capacity: 500, speed: 0.8, concealment: 4, costPerKgPerLeg: 12 },
  tir_truck: { mode: 'tir_truck', label: 'TIR Truck (Mariusz)', icon: '🚛', capacity: 200, speed: 1.2, concealment: 6, costPerKgPerLeg: 18 },
  ocean_container: { mode: 'ocean_container', label: 'Ocean Container', icon: '📦', capacity: 2000, speed: 0.5, concealment: 7, costPerKgPerLeg: 6 },
};

// ═══════════════════════════════════════════════════════════════
// NPCs — The Three Faction Leaders
// ═══════════════════════════════════════════════════════════════

export const NPCS: NPC[] = [
  {
    id: 'yayaya',
    name: 'YAYAYAhujUS',
    alias: 'The Joker',
    title: 'Gatekeeper of Asia',
    emoji: '🃏',
    domain: ['vn_kh', 'bangkok', 'pattaya', 'chittagong', 'mumbai'],
    color: '#f472b6',
    description: 'Disarmingly funny. Tells exactly one joke before every deal. The joke\'s quality is a hidden die roll that sets a mission modifier.',
    dialogueStyle: 'Punchlines as power moves.',
    jokes: [
      '"Why did the container cross the ocean? Because no one checked the manifest. …You will check the manifest, yes?"',
      '"A monk asks: what is the sound of one hand clapping? I say: what is the sound of one container getting scanned?"',
      '"My friend, in Thailand we say: the river does not ask where it flows. Neither should you."',
      '"You know why I laugh? Because the alternative is a prison cell with bad ventilation."',
      '"Knock knock. Who\'s there? Customs. Customs who? Customs why I\'m not worried."',
    ],
    smsMessages: [
      'Why did the new boss succeed in Bangkok? …I\'ll tell you when you\'re worth the punchline. 🃏',
      'The Joker is pleased. Your routes are… funny. In a good way.',
      'You made me laugh today. That\'s worth more than money. Almost.',
      'Don\'t make me send Kenji to talk to you. You don\'t want that conversation.',
    ],
    innerCirclePerk: 'Joker\'s Gambit: Before each mission, his joke rolls a random buff/curse',
  },
  {
    id: 'mariusz',
    name: 'Mariusz WWW',
    alias: 'The Merhujus',
    title: 'Rotterdam Bottleneck',
    emoji: '🚛',
    domain: ['bialystok', 'rotterdam'],
    color: '#60a5fa',
    description: 'Gritty, exhausted, chain-drinks coffee. Communicates in one-line SMS. Patriotic truck decal, patched coveralls, zero sense of humor.',
    dialogueStyle: 'Deadpan SMS messages. Short. Brutal. Accurate.',
    jokes: [],
    smsMessages: [
      'Too many pallets. I am one man. With one back.',
      'Container is at berth 7. Don\'t ask questions. Just drive.',
      'POLSKA. The truck says POLSKA. The cargo says nothing. I say: on time.',
      'You are late. The port does not care about your excuses. Neither do I.',
      'Ghost Convoy ready. One leg. Zero risk. Do not waste it.',
      'Białystok border is hot today. Three trucks pulled. Yours is not one of them. Yet.',
    ],
    innerCirclePerk: 'Ghost Convoy: One EU leg per week runs at 0 added risk',
  },
  {
    id: 'blackhujus',
    name: 'The Imperator BLACKHUJUS',
    alias: 'Black Sovereign',
    title: 'Supplier of Last Resort',
    emoji: '👑',
    domain: ['rio', 'batumi'],
    color: '#fbbf24',
    description: 'Imperial, theatrical. Sits on a golden throne in a neon jungle compound. Speaks in proclamations. Controls raw supply and the Rio branch.',
    dialogueStyle: 'Grand proclamations. Imperial decrees. Menacing calm.',
    jokes: [],
    smsMessages: [
      'The Sovereign acknowledges your tribute. The empire remembers those who pay.',
      'Your tribute is LATE. The rivers of commerce do not wait for tardy vassals.',
      'Bulk supply unlocked. The Sovereign\'s ports run deep. Your competitors run dry.',
      'You dare delay? The jungle has eyes. The ocean has ears. Pay. Or be replaced.',
    ],
    innerCirclePerk: 'Sovereign\'s Mandate: Raw at −30%, Rio tribute waived',
  },
];

// ═══════════════════════════════════════════════════════════════
// LAUNDERING METHODS
// ═══════════════════════════════════════════════════════════════

export const LAUNDER_METHODS = [
  { id: 'courier', name: 'Courier Drop', feePct: 30, delayHours: 0, auditRisk: 0, requirement: 'Always available', icon: '💵' },
  { id: 'cash_business', name: 'Cash Business Front', feePct: 15, delayHours: 48, auditRisk: 5, requirement: 'Purchase with $C', icon: '🏪' },
  { id: 'tour_shows', name: 'YAYAYAhujUS Touring Shows', feePct: 12, delayHours: 72, auditRisk: 5, requirement: 'Joker: Trusted', icon: '🎭' },
  { id: 'shell_company', name: 'Shell Company Network', feePct: 8, delayHours: 120, auditRisk: 15, requirement: 'Global Attention < 40', icon: '🏢' },
  { id: 'offshore', name: 'BLACKHUJUS Offshore Ledger', feePct: 5, delayHours: 24, auditRisk: 0, requirement: 'Imperator: Inner Circle', icon: '🏦' },
];

// ═══════════════════════════════════════════════════════════════
// RANDOM EVENTS DECK
// ═══════════════════════════════════════════════════════════════

export const RANDOM_EVENTS = [
  { id: 'monsoon', title: 'Monsoon at Chittagong', message: 'Heavy seas delay all shipping in the Bay of Bengal.', nodeEffect: 'chittagong', heatDelta: 10, type: 'warning' as const },
  { id: 'scanner', title: 'New Scanner at Rotterdam', message: 'Port authority installed new X-ray scanners. Heat rises.', nodeEffect: 'rotterdam', heatDelta: 15, type: 'danger' as const },
  { id: 'joker_town', title: 'The Joker Is in Town', message: 'YAYAYAhujUS visits Bangkok. All Asian bribes half price for 24h.', nodeEffect: 'bangkok', heatDelta: -10, type: 'success' as const },
  { id: 'strike', title: 'Driver\'s Strike in Białystok', message: 'Polish transport workers strike. Land legs paused unless you pay triple.', nodeEffect: 'bialystok', heatDelta: 8, type: 'warning' as const },
  { id: 'joke_lands', title: 'A Joke Lands Badly', message: 'YAYAYAhujUS\'s latest pun fell flat. Minor reputation dip.', nodeEffect: 'bangkok', heatDelta: 0, type: 'info' as const },
  { id: 'audience', title: 'The Imperator Requests an Audience', message: 'BLACKHUJUS demands early tribute. Refuse and face the Squeeze.', nodeEffect: 'batumi', heatDelta: 5, type: 'danger' as const },
  { id: 'cool_breeze', title: 'Cool Breeze', message: 'Law enforcement rotates staff. Heat decays faster across all nodes.', nodeEffect: 'all', heatDelta: -8, type: 'success' as const },
  { id: 'informant', title: 'Informant Spotted', message: 'Someone is talking. Global Attention rises.', nodeEffect: 'all', heatDelta: 5, type: 'danger' as const },
  { id: 'bonus_buyer', title: 'Premium Buyer in Boston', message: 'A whale buyer enters the market. Price Index +20% for 48h.', nodeEffect: 'boston', heatDelta: 0, type: 'success' as const },
  { id: 'patrol', title: 'Joint Patrol Increased', message: 'International cooperation on the Black Sea route.', nodeEffect: 'odesa', heatDelta: 12, type: 'warning' as const },
];

// ═══════════════════════════════════════════════════════════════
// INTERDICTION EVENTS
// ═══════════════════════════════════════════════════════════════

export const INTERDICTION_EVENTS = [
  {
    id: 'border_check',
    title: 'Border Checkpoint',
    messages: [
      'Border patrol stops the convoy. Documents requested.',
      'Customs officers flag the vehicle for inspection.',
      'A patrol car pulls alongside. They want to look inside.',
    ],
    choices: [
      { label: 'Pay shakedown', action: 'shakedown', riskPct: 0 },
      { label: 'Risk the run', action: 'risk', riskPct: 65 },
      { label: 'Burn the cargo', action: 'burn', riskPct: 0 },
    ],
  },
  {
    id: 'port_scan',
    title: 'Port Security Scan',
    messages: [
      'Container selected for random X-ray scan.',
      'Port authority K-9 unit approaching.',
      'Security alert: manifest discrepancy flagged.',
    ],
    choices: [
      { label: 'Bribe inspector ($5k)', action: 'shakedown', riskPct: 10 },
      { label: 'Bluff through', action: 'risk', riskPct: 55 },
      { label: 'Abort — dump cargo', action: 'burn', riskPct: 0 },
    ],
  },
  {
    id: 'highway_patrol',
    title: 'Highway Patrol',
    messages: [
      'Police cruiser falls in behind. Lights flashing.',
      'Random vehicle check on the motorway.',
      'Weigh station detour — they\'re looking closer than usual.',
    ],
    choices: [
      { label: 'Pay the fine ($3k)', action: 'shakedown', riskPct: 5 },
      { label: 'Drive through', action: 'risk', riskPct: 45 },
      { label: 'Pull over & cooperate', action: 'cooperate', riskPct: 30 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getNode(id: string): GameNode | undefined {
  return NODES.find(n => n.id === id);
}

export function getEdgesFrom(nodeId: string): Edge[] {
  return ROUTES.filter(r => r.from === nodeId);
}

export function getHeatState(heat: number): 'cold' | 'warm' | 'hot' | 'burning' {
  if (heat < 30) return 'cold';
  if (heat < 60) return 'warm';
  if (heat < 85) return 'hot';
  return 'burning';
}

export function getHeatColor(heat: number): string {
  if (heat < 30) return '#22c55e'; // green
  if (heat < 60) return '#f59e0b'; // amber
  if (heat < 85) return '#ef4444'; // red
  return '#dc2626'; // dark red
}

export function getRepTier(rep: number): 'hostile' | 'tolerated' | 'trusted' | 'inner_circle' {
  if (rep < 20) return 'hostile';
  if (rep < 50) return 'tolerated';
  if (rep < 80) return 'trusted';
  return 'inner_circle';
}

export function getRepLabel(tier: string): string {
  switch (tier) {
    case 'hostile': return 'Hostile';
    case 'tolerated': return 'Tolerated';
    case 'trusted': return 'Trusted';
    case 'inner_circle': return 'Inner Circle';
    default: return 'Unknown';
  }
}

export function calculateEffectiveRisk(
  baseRisk: number,
  nodeHeat: number,
  globalAttention: number,
  volumeKg: number,
  bribeCoverage: number,
  concealmentRating: number,
  contactPerks: number
): number {
  const raw = baseRisk
    + nodeHeat * 0.15
    + globalAttention * 0.05
    + (volumeKg > 100 ? (volumeKg - 100) * 0.02 : 0)
    - bribeCoverage
    - concealmentRating
    - contactPerks;
  return Math.max(1, Math.min(95, raw));
}
