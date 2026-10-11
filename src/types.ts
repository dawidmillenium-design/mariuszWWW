// ═══════════════════════════════════════════════════════════════
// SHADOW ROUTES: The Green Powder Trail — Type Definitions
// ═══════════════════════════════════════════════════════════════

export type NodeType = 'origin' | 'transit' | 'hub' | 'port' | 'market';
export type HeatState = 'cold' | 'warm' | 'hot' | 'burning';
export type RepTier = 'hostile' | 'tolerated' | 'trusted' | 'inner_circle';
export type ShipmentStatus = 'planning' | 'in_transit' | 'interdicted' | 'delivered' | 'failed';
export type EventCategory = 'interdiction' | 'random' | 'npc' | 'system' | 'tutorial' | 'success' | 'danger' | 'warning' | 'info';

export interface GameNode {
  id: string;
  name: string;
  shortName: string;
  type: NodeType;
  region: string;
  x: number; // map % position
  y: number;
  baseBribeCost: number;
  priceIndex: number; // sell price per kg refined
  buyPrice: number;  // buy price per kg raw
  description: string;
  npcDomain?: string; // which NPC controls this node
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  mode: TransportMode;
  baseRisk: number;     // percentage
  baseHours: number;    // game hours
  costPerKg: number;
  description: string;
}

export type TransportMode = 'motorbike' | 'pickup' | 'freighter' | 'tir_truck' | 'ocean_container';

export interface TransportInfo {
  mode: TransportMode;
  label: string;
  icon: string;
  capacity: number;
  speed: number; // multiplier
  concealment: number; // 0-10% risk reduction
  costPerKgPerLeg: number;
}

export interface NPC {
  id: string;
  name: string;
  alias: string;
  title: string;
  emoji: string;
  domain: string[]; // node IDs
  color: string;
  description: string;
  dialogueStyle: string;
  jokes: string[];
  smsMessages: string[];
  innerCirclePerk: string;
}

export interface ContactState {
  npcId: string;
  reputation: number; // 0-100
  tier: RepTier;
  tributeDueAt?: number; // game day
  tributeAmount?: number;
}

export interface SafeHouse {
  id: string;
  nodeId: string;
  capacity: number;
  conversionRatio: number;
  storedRaw: number;
  storedRefined: number;
  burned: boolean;
  owned: boolean;
  purchaseCost: number;
}

export interface ShipmentLeg {
  edgeId: string;
  vehicle: TransportMode;
  bribePaid: number;
  riskSnapshot: number;
  outcome?: 'pending' | 'success' | 'shakedown' | 'seizure' | 'arrest' | 'informant';
  hoursElapsed: number;
  totalHours: number;
}

export interface Shipment {
  id: string;
  status: ShipmentStatus;
  totalKg: number;
  currentKg: number;
  legs: ShipmentLeg[];
  currentLegIndex: number;
  startedAt: number;
  routeNames: string[];
}

export interface LaunderJob {
  id: string;
  method: string;
  amountIn: number;
  feePct: number;
  completesAt: number;
  status: 'pending' | 'complete' | 'audited';
}

export interface GameEvent {
  id: string;
  day: number;
  category: EventCategory;
  title: string;
  message: string;
  choices?: EventChoice[];
  resolved?: boolean;
  timestamp: number;
}

export interface EventChoice {
  label: string;
  action: string;
  riskPct?: number;
}

export interface PlayerState {
  dirtyCash: number;
  cleanCash: number;
  rawKg: number;
  refinedKg: number;
  globalAttention: number;
  gameDay: number;
  gameHour: number;
  speed: number; // 1, 2, or 4
  paused: boolean;
  nodeHeat: Record<string, number>;
  contacts: ContactState[];
  safeHouses: SafeHouse[];
  shipments: Shipment[];
  launderJobs: LaunderJob[];
  events: GameEvent[];
  tutorialStep: number;
  tutorialComplete: boolean;
  totalProfit: number;
  deliveriesCompleted: number;
  convoysLost: number;
}
