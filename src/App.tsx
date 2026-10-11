import { useState, useEffect, useCallback, useRef } from 'react';
import {
  NODES, ROUTES, TRANSPORT, NPCS, LAUNDER_METHODS,
  RANDOM_EVENTS, INTERDICTION_EVENTS,
  getNode, getEdgesFrom, getHeatState, getHeatColor, getRepTier, getRepLabel,
  calculateEffectiveRisk,
} from './gameData';
import type { PlayerState, Shipment, ShipmentLeg, GameEvent, LaunderJob, TransportMode } from './types';

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════

const createInitialState = (): PlayerState => ({
  dirtyCash: 5000,
  cleanCash: 10000,
  rawKg: 0,
  refinedKg: 0,
  globalAttention: 5,
  gameDay: 1,
  gameHour: 6,
  speed: 1,
  paused: false,
  nodeHeat: Object.fromEntries(NODES.map(n => [n.id, n.id === 'vn_kh' ? 10 : 5])),
  contacts: [
    { npcId: 'yayaya', reputation: 10, tier: 'tolerated' },
    { npcId: 'mariusz', reputation: 0, tier: 'hostile' },
    { npcId: 'blackhujus', reputation: 0, tier: 'hostile' },
  ],
  safeHouses: [
    { id: 'sh_bkk', nodeId: 'bangkok', capacity: 100, conversionRatio: 0.7, storedRaw: 0, storedRefined: 0, burned: false, owned: true, purchaseCost: 0 },
  ],
  shipments: [],
  launderJobs: [],
  events: [],
  tutorialStep: 0,
  tutorialComplete: false,
  totalProfit: 0,
  deliveriesCompleted: 0,
  convoysLost: 0,
});

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [state, setState] = useState<PlayerState>(createInitialState);
  const [showIntro, setShowIntro] = useState(true);
  const [gameOver, setGameOver] = useState<string | null>(null); // null | 'busted' | 'retired'
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showLaunder, setShowLaunder] = useState(false);
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'contacts' | 'ledger'>('map');
  const [eventTimer, setEventTimer] = useState(20);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Notify helper
  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Add event
  const addEvent = useCallback((title: string, message: string, category: GameEvent['category'] = 'system') => {
    setState(prev => ({
      ...prev,
      events: [{
        id: Date.now().toString() + Math.random(),
        day: prev.gameDay,
        category,
        title,
        message,
        timestamp: Date.now(),
      }, ...prev.events].slice(0, 100),
    }));
  }, []);

  // Game tick (every second = 1 game hour at 1x)
  useEffect(() => {
    if (showIntro || gameOver) return;
    tickRef.current = setInterval(() => {
      setState(prev => {
        if (prev.paused) return prev;
        const hoursPerTick = prev.speed;
        let newHour = prev.gameHour + hoursPerTick;
        let newDay = prev.gameDay;
        while (newHour >= 24) { newHour -= 24; newDay += 1; }

        // Decay heat slightly each tick
        const newHeat = { ...prev.nodeHeat };
        Object.keys(newHeat).forEach(k => {
          newHeat[k] = Math.max(0, newHeat[k] - 0.1 * hoursPerTick);
        });

        // Process shipments
        const newShipments = prev.shipments.map(s => {
          if (s.status !== 'in_transit') return s;
          const legs = [...s.legs];
          const leg = { ...legs[s.currentLegIndex] };
          leg.hoursElapsed += hoursPerTick;
          legs[s.currentLegIndex] = leg;

          if (leg.hoursElapsed >= leg.totalHours) {
            // Leg complete — roll for interdiction
            const roll = Math.random() * 100;
            if (roll < leg.riskSnapshot) {
              // Interdiction!
              const outcomeRoll = Math.random();
              let outcome: ShipmentLeg['outcome'];
              let kgLost = 0;
              let cashLost = 0;
              let attentionGain = 0;

              if (outcomeRoll < 0.4) {
                outcome = 'shakedown';
                cashLost = s.currentKg * 200;
              } else if (outcomeRoll < 0.7) {
                outcome = 'seizure';
                kgLost = Math.ceil(s.currentKg * 0.5);
                attentionGain = 2;
              } else if (outcomeRoll < 0.9) {
                outcome = 'arrest';
                kgLost = s.currentKg;
                attentionGain = 5;
              } else {
                outcome = 'informant';
                kgLost = Math.ceil(s.currentKg * 0.3);
                attentionGain = 15;
              }

              // Trigger interdiction event popup
              const interEvent = INTERDICTION_EVENTS[Math.floor(Math.random() * INTERDICTION_EVENTS.length)];
              const edge = ROUTES.find(r => r.id === leg.edgeId);
              const fromNode = getNode(edge?.from || '');
              const toNode = getNode(edge?.to || '');

              // For now, auto-resolve (could show popup)
              const newKg = Math.max(0, s.currentKg - kgLost);
              if (newKg === 0) {
                return { ...s, status: 'failed' as const, currentKg: 0, legs };
              }

              // Advance to next leg or deliver
              if (s.currentLegIndex < s.legs.length - 1) {
                return { ...s, currentKg: newKg, legs, currentLegIndex: s.currentLegIndex + 1 };
              } else {
                return { ...s, status: 'delivered' as const, currentKg: newKg, legs };
              }
            } else {
              // Success — advance
              if (s.currentLegIndex < s.legs.length - 1) {
                return { ...s, legs, currentLegIndex: s.currentLegIndex + 1 };
              } else {
                return { ...s, status: 'delivered' as const, legs };
              }
            }
          }
          return { ...s, legs };
        });

        // Process completed deliveries
        let dirtyCashAdd = 0;
        let deliveriesDone = 0;
        newShipments.forEach(s => {
          if (s.status === 'delivered' && prev.shipments.find(ps => ps.id === s.id)?.status !== 'delivered') {
            const lastLeg = s.legs[s.legs.length - 1];
            const edge = ROUTES.find(r => r.id === lastLeg.edgeId);
            const destNode = getNode(edge?.to || '');
            if (destNode) {
              const revenue = s.currentKg * destNode.priceIndex;
              dirtyCashAdd += revenue;
              deliveriesDone += 1;
            }
          }
        });

        // Process launder jobs
        const newLaunder = prev.launderJobs.map(j => {
          if (j.status === 'pending' && newDay * 24 + newHour >= j.completesAt) {
            return { ...j, status: 'complete' as const };
          }
          return j;
        });

        let cleanCashAdd = 0;
        newLaunder.forEach(j => {
          if (j.status === 'complete' && prev.launderJobs.find(pj => pj.id === j.id)?.status !== 'complete') {
            cleanCashAdd += j.amountIn * (1 - j.feePct / 100);
          }
        });

        // Random events (small chance per tick)
        if (Math.random() < 0.002 * hoursPerTick) {
          const re = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
          if (re.nodeEffect === 'all') {
            Object.keys(newHeat).forEach(k => {
              newHeat[k] = Math.max(0, Math.min(100, newHeat[k] + re.heatDelta));
            });
          } else {
            newHeat[re.nodeEffect] = Math.max(0, Math.min(100, (newHeat[re.nodeEffect] || 0) + re.heatDelta));
          }
        }

        // Global attention decay
        const newAttention = Math.max(0, prev.globalAttention - 0.01 * hoursPerTick);

        // Check game over
        const maxHeat = Math.max(...Object.values(newHeat));
        if (newAttention >= 100 || maxHeat >= 100) {
          setTimeout(() => setGameOver('busted'), 100);
        }

        return {
          ...prev,
          gameDay: newDay,
          gameHour: Math.floor(newHour),
          nodeHeat: newHeat,
          shipments: newShipments,
          launderJobs: newLaunder,
          dirtyCash: prev.dirtyCash + dirtyCashAdd,
          cleanCash: prev.cleanCash + cleanCashAdd,
          globalAttention: newAttention,
          deliveriesCompleted: prev.deliveriesCompleted + deliveriesDone,
          totalProfit: prev.totalProfit + dirtyCashAdd,
        };
      });
    }, 1000);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [showIntro, gameOver]);

  // Event timer
  useEffect(() => {
    if (activeEvent && eventTimer > 0) {
      timerRef.current = setInterval(() => {
        setEventTimer(t => {
          if (t <= 1) {
            // Auto-resolve: worst outcome
            resolveEventChoice('risk');
            return 20;
          }
          return t - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [activeEvent, eventTimer]);

  // ═══════════════════════════════════════════════════════════════
  // GAME ACTIONS
  // ═══════════════════════════════════════════════════════════════

  const buyRaw = (kg: number) => {
    const node = getNode('vn_kh')!;
    const cost = kg * node.buyPrice;
    if (state.cleanCash < cost) { notify('❌ Not enough clean cash!'); return; }
    setState(prev => ({
      ...prev,
      cleanCash: prev.cleanCash - cost,
      rawKg: prev.rawKg + kg,
      safeHouses: prev.safeHouses.map(sh =>
        sh.nodeId === 'bangkok' ? { ...sh, storedRaw: sh.storedRaw + kg } : sh
      ),
    }));
    addEvent('Purchase', `Bought ${kg}kg raw Emerald Compound for $${cost.toLocaleString()}`, 'system');
    notify(`✅ Bought ${kg}kg raw compound`);
  };

  const convertCompound = () => {
    const sh = state.safeHouses.find(s => s.nodeId === 'bangkok' && !s.burned);
    if (!sh || sh.storedRaw <= 0) { notify('❌ No raw compound to convert!'); return; }
    const converted = Math.floor(sh.storedRaw * sh.conversionRatio);
    const fee = sh.storedRaw * 500;
    if (state.dirtyCash < fee) { notify('❌ Not enough dirty cash for conversion fee!'); return; }
    setState(prev => ({
      ...prev,
      dirtyCash: prev.dirtyCash - fee,
      rawKg: prev.rawKg - sh.storedRaw,
      refinedKg: prev.refinedKg + converted,
      safeHouses: prev.safeHouses.map(s =>
        s.id === sh.id ? { ...s, storedRaw: 0, storedRefined: s.storedRefined + converted } : s
      ),
      nodeHeat: { ...prev.nodeHeat, bangkok: (prev.nodeHeat.bangkok || 0) + 3 },
    }));
    addEvent('Conversion', `Converted ${sh.storedRaw}kg raw → ${converted}kg refined (fee: $${fee.toLocaleString()})`, 'system');
    notify(`🧪 Converted to ${converted}kg refined`);
  };

  const startLaunder = (methodId: string) => {
    const method = LAUNDER_METHODS.find(m => m.id === methodId);
    if (!method) return;
    const amount = Math.min(state.dirtyCash, method.id === 'courier' ? state.dirtyCash : state.dirtyCash * 0.5);
    if (amount < 1000) { notify('❌ Minimum $1,000 to launder'); return; }
    const job: LaunderJob = {
      id: Date.now().toString(),
      method: method.name,
      amountIn: amount,
      feePct: method.feePct,
      completesAt: state.gameDay * 24 + state.gameHour + method.delayHours,
      status: 'pending',
    };
    setState(prev => ({
      ...prev,
      dirtyCash: prev.dirtyCash - amount,
      launderJobs: [...prev.launderJobs, job],
    }));
    if (method.delayHours === 0) {
      setState(prev => ({
        ...prev,
        cleanCash: prev.cleanCash + amount * (1 - method.feePct / 100),
        launderJobs: prev.launderJobs.map(j => j.id === job.id ? { ...j, status: 'complete' as const } : j),
      }));
      notify(`💰 Laundered $${amount.toLocaleString()} → $${Math.floor(amount * (1 - method.feePct / 100)).toLocaleString()} clean`);
    } else {
      notify(`🏦 Laundering $${amount.toLocaleString()} via ${method.name} (${method.delayHours}h delay)`);
    }
    addEvent('Launder', `$${amount.toLocaleString()} → ${method.name} (${method.feePct}% fee)`, 'system');
  };

  const createShipment = (route: string[], kg: number, vehicle: TransportMode) => {
    if (state.refinedKg < kg) { notify('❌ Not enough refined compound!'); return; }
    const legs: ShipmentLeg[] = [];
    for (let i = 0; i < route.length - 1; i++) {
      const edge = ROUTES.find(r => r.from === route[i] && r.to === route[i + 1]);
      if (!edge) continue;
      const transport = TRANSPORT[vehicle];
      const heat = state.nodeHeat[route[i]] || 0;
      const risk = calculateEffectiveRisk(
        edge.baseRisk, heat, state.globalAttention, kg,
        0, transport.concealment, 0
      );
      legs.push({
        edgeId: edge.id,
        vehicle,
        bribePaid: 0,
        riskSnapshot: risk,
        outcome: 'pending',
        hoursElapsed: 0,
        totalHours: edge.baseHours,
      });
    }

    const transport = TRANSPORT[vehicle];
    const totalCost = legs.reduce((sum, l) => {
      const edge = ROUTES.find(r => r.id === l.edgeId)!;
      return sum + edge.costPerKg * kg;
    }, 0);

    if (state.dirtyCash < totalCost) { notify('❌ Not enough dirty cash for transport!'); return; }

    const shipment: Shipment = {
      id: Date.now().toString(),
      status: 'in_transit',
      totalKg: kg,
      currentKg: kg,
      legs,
      currentLegIndex: 0,
      startedAt: state.gameDay,
      routeNames: route.map(r => getNode(r)?.shortName || r),
    };

    setState(prev => ({
      ...prev,
      dirtyCash: prev.dirtyCash - totalCost,
      refinedKg: prev.refinedKg - kg,
      shipments: [...prev.shipments, shipment],
      nodeHeat: { ...prev.nodeHeat, [route[0]]: (prev.nodeHeat[route[0]] || 0) + 2 + Math.floor(kg / 50) },
    }));

    addEvent('Shipment Launched', `${kg}kg dispatched: ${route.map(r => getNode(r)?.shortName).join(' → ')}`, 'system');
    notify(`🚀 Shipment launched: ${kg}kg en route`);
    setShowPlanner(false);
  };

  const resolveEventChoice = (action: string) => {
    setActiveEvent(null);
    setEventTimer(20);
    if (action === 'shakedown') {
      const cost = Math.floor(state.dirtyCash * 0.1);
      setState(prev => ({ ...prev, dirtyCash: prev.dirtyCash - cost }));
      addEvent('Event Resolved', `Paid shakedown: -$${cost.toLocaleString()}`, 'system');
    } else if (action === 'risk') {
      if (Math.random() < 0.5) {
        const kgLost = Math.ceil(state.refinedKg * 0.3);
        setState(prev => ({
          ...prev,
          refinedKg: prev.refinedKg - kgLost,
          globalAttention: prev.globalAttention + 5,
        }));
        addEvent('Event Failed', `Lost ${kgLost}kg! Attention +5`, 'system');
      } else {
        addEvent('Event Survived', 'Made it through by the skin of your teeth.', 'success');
      }
    } else if (action === 'burn') {
      const kgLost = Math.ceil(state.refinedKg * 0.5);
      setState(prev => ({ ...prev, refinedKg: prev.refinedKg - kgLost }));
      addEvent('Cargo Burned', `Destroyed ${kgLost}kg to avoid detection.`, 'warning');
    }
  };

  const changeRep = (npcId: string, delta: number) => {
    setState(prev => ({
      ...prev,
      contacts: prev.contacts.map(c =>
        c.npcId === npcId
          ? { ...c, reputation: Math.max(0, Math.min(100, c.reputation + delta)), tier: getRepTier(c.reputation + delta) }
          : c
      ),
    }));
  };

  const resetGame = () => {
    setState(createInitialState());
    setGameOver(null);
    setShowIntro(true);
    setSelectedNode(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // INTRO SCREEN
  if (showIntro) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 overflow-auto">
        <div className="max-w-3xl w-full">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🌿</div>
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-500 tracking-tight">
              SHADOW ROUTES
            </h1>
            <p className="text-green-400/60 text-lg mt-2 tracking-widest uppercase">The Emerald Compound Trail</p>
            <div className="mt-4 h-px w-48 mx-auto bg-gradient-to-r from-transparent via-green-500 to-transparent" />
          </div>

          {/* Briefing Card */}
          <div className="bg-gray-900/80 backdrop-blur border border-green-500/20 rounded-2xl p-6 mb-6">
            <h2 className="text-green-400 font-bold text-sm tracking-widest uppercase mb-3">📋 Operation Briefing</h2>
            <p className="text-gray-300 leading-relaxed text-sm mb-4">
              You are the invisible hand routing a volatile, luminous green powder across five continents.
              Every route is a bet. Every decision prices risk. You are one spreadsheet away from ruin — or empire.
            </p>

            {/* Three Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4">
                <div className="text-2xl mb-2">🃏</div>
                <h3 className="text-pink-400 font-bold text-sm">YAYAYAhujUS</h3>
                <p className="text-xs text-gray-400 mt-1">The Joker. Gatekeeper of Asia. Every deal starts with a joke.</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="text-2xl mb-2">🚛</div>
                <h3 className="text-blue-400 font-bold text-sm">Mariusz WWW</h3>
                <p className="text-xs text-gray-400 mt-1">The Bottleneck. Rotterdam is his kingdom. One man. One back.</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="text-2xl mb-2">👑</div>
                <h3 className="text-yellow-400 font-bold text-sm">BLACKHUJUS</h3>
                <p className="text-xs text-gray-400 mt-1">The Imperator. Supplier of Last Resort. Pay tribute or be replaced.</p>
              </div>
            </div>

            {/* Route */}
            <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
              <h3 className="text-green-400 font-bold text-xs tracking-widest uppercase mb-2">🗺️ The Green Route</h3>
              <div className="flex flex-wrap items-center gap-1 text-xs text-gray-400">
                <span className="text-yellow-400 font-bold">VN–KH</span>
                <span className="text-gray-600">→</span>
                <span className="text-pink-400">Bangkok</span>
                <span className="text-gray-600">→</span>
                <span>Chittagong</span>
                <span className="text-gray-600">→</span>
                <span>Mumbai</span>
                <span className="text-gray-600">→</span>
                <span>Bandar Abbas</span>
                <span className="text-gray-600">→</span>
                <span>Batumi</span>
                <span className="text-gray-600">→</span>
                <span>Odesa</span>
                <span className="text-gray-600">→</span>
                <span className="text-blue-400 font-bold">Białystok</span>
                <span className="text-gray-600">→</span>
                <span className="text-blue-400 font-bold">Rotterdam</span>
                <span className="text-gray-600">→</span>
                <span className="text-green-400 font-bold">Boston 💎</span>
              </div>
            </div>

            {/* Mechanics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-gray-800/30 rounded-lg p-3">
                <span className="text-green-400 font-bold">💰 DUAL CURRENCY</span>
                <p className="text-gray-500 mt-1">Dirty cash from sales. Must launder to buy assets.</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-3">
                <span className="text-red-400 font-bold">🔥 HEAT SYSTEM</span>
                <p className="text-gray-500 mt-1">Each node heats up. Too hot = closed. Let it cool.</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-3">
                <span className="text-purple-400 font-bold">⚖️ RISK MATH</span>
                <p className="text-gray-500 mt-1">Every leg has survival %. Price risk vs reward.</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-3">
                <span className="text-yellow-400 font-bold">👥 NPC REPS</span>
                <p className="text-gray-500 mt-1">Three factions. Build trust or face consequences.</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowIntro(false)}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black text-lg rounded-xl transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 tracking-wider"
          >
            ▶ BEGIN OPERATION
          </button>
          <p className="text-center text-xs text-gray-600 mt-3">
            All content fictional. A math-driven risk simulator. Not instructions.
          </p>
        </div>
      </div>
    );
  }

  // GAME OVER SCREEN
  if (gameOver) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-gray-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-500/10 text-center">
          <div className="text-7xl mb-4">{gameOver === 'busted' ? '🚨' : '👑'}</div>
          <h1 className={`text-4xl font-black mb-2 ${gameOver === 'busted' ? 'text-red-400' : 'text-yellow-400'}`}>
            {gameOver === 'busted' ? 'ROLLED UP' : 'GLOBALLY BOUND'}
          </h1>
          <p className="text-gray-400 mb-6">
            {gameOver === 'busted'
              ? 'Your network has been compromised. Global attention exceeded critical threshold.'
              : 'You made it. Clean millions in an offshore account. Time to disappear.'}
          </p>
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 text-left">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Days:</span> <span className="text-white font-bold">{state.gameDay}</span></div>
              <div><span className="text-gray-500">Dirty Cash:</span> <span className="text-yellow-400 font-bold">${state.dirtyCash.toLocaleString()}</span></div>
              <div><span className="text-gray-500">Clean Cash:</span> <span className="text-green-400 font-bold">${state.cleanCash.toLocaleString()}</span></div>
              <div><span className="text-gray-500">Deliveries:</span> <span className="text-white font-bold">{state.deliveriesCompleted}</span></div>
              <div><span className="text-gray-500">Convoys Lost:</span> <span className="text-red-400 font-bold">{state.convoysLost}</span></div>
              <div><span className="text-gray-500">Total Revenue:</span> <span className="text-green-400 font-bold">${state.totalProfit.toLocaleString()}</span></div>
            </div>
          </div>
          <button
            onClick={resetGame}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl transition-all"
          >
            🔄 NEW OPERATION
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN GAME UI
  // ═══════════════════════════════════════════════════════════════

  const selectedNodeData = selectedNode ? getNode(selectedNode) : null;
  const availableEdges = selectedNode ? getEdgesFrom(selectedNode) : [];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-gray-800/95 border border-green-500/50 text-green-400 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-sm text-sm font-medium animate-bounce">
          {notification}
        </div>
      )}

      {/* ═══ TOP BAR ═══ */}
      <header className="bg-gray-900/95 border-b border-gray-800 px-3 py-2 flex items-center justify-between backdrop-blur-sm z-50 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-green-400 font-black text-sm tracking-wider hidden md:block">SHADOW ROUTES</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">
              Day {state.gameDay} • {String(Math.floor(state.gameHour)).padStart(2, '0')}:00
            </span>
            <div className="flex gap-0.5">
              {[1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setState(prev => ({ ...prev, speed: s }))}
                  className={`text-xs px-1.5 py-0.5 rounded ${state.speed === s ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}
                >
                  {s}×
                </button>
              ))}
              <button
                onClick={() => setState(prev => ({ ...prev, paused: !prev.paused }))}
                className={`text-xs px-1.5 py-0.5 rounded ${state.paused ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}
              >
                {state.paused ? '▶' : '⏸'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
            <span>💵</span>
            <span className="text-yellow-400 font-bold">${(state.dirtyCash / 1000).toFixed(1)}k</span>
            <span className="text-yellow-400/50 text-[10px]">dirty</span>
          </div>
          <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
            <span>💰</span>
            <span className="text-green-400 font-bold">${(state.cleanCash / 1000).toFixed(1)}k</span>
            <span className="text-green-400/50 text-[10px]">clean</span>
          </div>
          <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
            <span>🧪</span>
            <span className="text-emerald-400 font-bold">{state.rawKg}kg</span>
          </div>
          <div className="flex items-center gap-1 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
            <span>✨</span>
            <span className="text-cyan-400 font-bold">{state.refinedKg}kg</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={state.globalAttention > 60 ? 'text-red-400' : state.globalAttention > 30 ? 'text-yellow-400' : 'text-green-400'}>⚠️</span>
            <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${state.globalAttention > 60 ? 'bg-red-500' : state.globalAttention > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${state.globalAttention}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500">{Math.round(state.globalAttention)}%</span>
          </div>
        </div>
      </header>

      {/* ═══ TAB NAV ═══ */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-3 flex gap-1 shrink-0">
        {(['map', 'contacts', 'ledger'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all ${
              activeTab === tab
                ? 'bg-gray-800 text-green-400 border-b-2 border-green-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'map' ? '🗺️ Map' : tab === 'contacts' ? '👥 Contacts' : '📋 Ledger'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPlanner(true)}
            className="px-3 py-1.5 bg-green-600/20 border border-green-600/50 text-green-400 text-xs font-bold rounded-lg hover:bg-green-600/30 transition-all"
          >
            + New Shipment
          </button>
          <button
            onClick={() => setShowLaunder(true)}
            className="px-3 py-1.5 bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 text-xs font-bold rounded-lg hover:bg-yellow-600/30 transition-all"
          >
            🏦 Launder
          </button>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'map' && (
          <>
            {/* WORLD MAP */}
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900">
                {/* Grid */}
                <div className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                  }}
                />

                {/* SVG Map */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                  {/* Route lines */}
                  {ROUTES.map((route) => {
                    const from = getNode(route.from);
                    const to = getNode(route.to);
                    if (!from || !to) return null;
                    const isActive = state.shipments.some(s =>
                      s.status === 'in_transit' && s.legs.some(l => l.edgeId === route.id)
                    );
                    return (
                      <g key={route.id}>
                        <line
                          x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                          stroke={isActive ? '#22c55e' : '#1f2937'}
                          strokeWidth={isActive ? '0.5' : '0.2'}
                          strokeDasharray={isActive ? '' : '0.8,0.8'}
                          opacity={isActive ? 0.9 : 0.5}
                        />
                        {isActive && (
                          <line
                            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                            stroke="#22c55e"
                            strokeWidth="0.8"
                            opacity="0.3"
                            filter="url(#glow)"
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Glow filter */}
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="0.5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="heatGlow">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* Convoy tokens */}
                  {state.shipments.filter(s => s.status === 'in_transit').map(s => {
                    const leg = s.legs[s.currentLegIndex];
                    const edge = ROUTES.find(r => r.id === leg.edgeId);
                    if (!edge) return null;
                    const from = getNode(edge.from);
                    const to = getNode(edge.to);
                    if (!from || !to) return null;
                    const progress = leg.hoursElapsed / leg.totalHours;
                    const cx = from.x + (to.x - from.x) * progress;
                    const cy = from.y + (to.y - from.y) * progress;
                    return (
                      <g key={s.id}>
                        <circle cx={cx} cy={cy} r="1.2" fill="#22c55e" opacity="0.3" filter="url(#glow)" />
                        <circle cx={cx} cy={cy} r="0.6" fill="#22c55e" />
                        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="1.5" fill="#22c55e" fontWeight="bold">
                          {s.currentKg}kg
                        </text>
                      </g>
                    );
                  })}

                  {/* Node heat halos */}
                  {NODES.map(node => {
                    const heat = state.nodeHeat[node.id] || 0;
                    const color = getHeatColor(heat);
                    return (
                      <circle
                        key={`halo-${node.id}`}
                        cx={node.x} cy={node.y} r="3"
                        fill={color} opacity="0.1"
                        filter="url(#heatGlow)"
                      />
                    );
                  })}

                  {/* Nodes */}
                  {NODES.map(node => {
                    const heat = state.nodeHeat[node.id] || 0;
                    const color = getHeatColor(heat);
                    const isSelected = selectedNode === node.id;
                    const typeColors: Record<string, string> = {
                      origin: '#fbbf24',
                      hub: '#a78bfa',
                      port: '#60a5fa',
                      transit: '#94a3b8',
                      market: '#22c55e',
                    };
                    const nodeColor = typeColors[node.type] || '#22c55e';

                    return (
                      <g
                        key={node.id}
                        onClick={() => setSelectedNode(isSelected ? null : node.id)}
                        className="cursor-pointer"
                      >
                        {/* Heat ring */}
                        <circle
                          cx={node.x} cy={node.y}
                          r={isSelected ? '2.5' : '2'}
                          fill="none"
                          stroke={color}
                          strokeWidth="0.3"
                          opacity="0.6"
                        />
                        {/* Node circle */}
                        <circle
                          cx={node.x} cy={node.y}
                          r={isSelected ? '1.5' : '1.2'}
                          fill={isSelected ? nodeColor : `${nodeColor}40`}
                          stroke={nodeColor}
                          strokeWidth="0.3"
                        />
                        {/* Label */}
                        <text
                          x={node.x} y={node.y + 3.5}
                          textAnchor="middle"
                          fontSize="1.6"
                          fill={isSelected ? '#ffffff' : '#9ca3af'}
                          fontWeight={isSelected ? 'bold' : 'normal'}
                        >
                          {node.shortName}
                        </text>
                        {/* Heat indicator */}
                        {heat > 30 && (
                          <text
                            x={node.x + 2} y={node.y - 1}
                            fontSize="1.2"
                            fill={color}
                          >
                            {heat > 85 ? '🔥' : heat > 60 ? '🟠' : '🟡'}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Map Legend */}
                <div className="absolute bottom-3 left-3 bg-gray-900/90 backdrop-blur rounded-lg p-3 text-[10px] border border-gray-700/50">
                  <div className="text-gray-400 font-bold mb-1 uppercase tracking-wider">Legend</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-gray-400">Origin</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-400" /><span className="text-gray-400">Hub</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-gray-400">Port</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400" /><span className="text-gray-400">Transit</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400" /><span className="text-gray-400">Market</span></div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-700/50">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-gray-400">Cold (&lt;30)</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500" /><span className="text-gray-400">Warm (30-59)</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-gray-400">Hot (60-84)</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-700" /><span className="text-gray-400">Burning (85+)</span></div>
                  </div>
                </div>

                {/* Paused Overlay */}
                {state.paused && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                    <div className="text-4xl font-black text-red-400/50 tracking-widest">⏸ PAUSED</div>
                  </div>
                )}
              </div>
            </div>

            {/* SIDE PANEL — Node Details */}
            <div className="w-80 bg-gray-900/80 border-l border-gray-800 overflow-y-auto shrink-0 hidden lg:block">
              {selectedNodeData ? (
                <div className="p-4">
                  {/* Node Header */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getHeatColor(state.nodeHeat[selectedNodeData.id] || 0) }} />
                      <h3 className="text-white font-bold text-sm">{selectedNodeData.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500">{selectedNodeData.region} • {selectedNodeData.type.toUpperCase()}</p>
                    <p className="text-xs text-gray-400 mt-2">{selectedNodeData.description}</p>
                  </div>

                  {/* Heat Status */}
                  <div className="bg-gray-800/50 rounded-lg p-3 mb-3 border border-gray-700/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">Heat Level</span>
                      <span className="text-xs font-bold" style={{ color: getHeatColor(state.nodeHeat[selectedNodeData.id] || 0) }}>
                        {Math.round(state.nodeHeat[selectedNodeData.id] || 0)}% — {getHeatState(state.nodeHeat[selectedNodeData.id] || 0).toUpperCase()}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${state.nodeHeat[selectedNodeData.id] || 0}%`,
                          backgroundColor: getHeatColor(state.nodeHeat[selectedNodeData.id] || 0)
                        }}
                      />
                    </div>
                  </div>

                  {/* Safe House */}
                  {state.safeHouses.filter(sh => sh.nodeId === selectedNodeData.id && !sh.burned).map(sh => (
                    <div key={sh.id} className="bg-gray-800/50 rounded-lg p-3 mb-3 border border-gray-700/50">
                      <div className="text-xs text-purple-400 font-bold mb-1">🏠 Safe House</div>
                      <div className="text-xs text-gray-400">
                        Raw: {sh.storedRaw}kg | Refined: {sh.storedRefined}kg | Capacity: {sh.capacity}
                      </div>
                      <div className="text-xs text-gray-400">Conversion ratio: {sh.conversionRatio * 100}%</div>
                    </div>
                  ))}

                  {/* Actions */}
                  <div className="space-y-2 mb-4">
                    {selectedNodeData.id === 'vn_kh' && (
                      <>
                        <button
                          onClick={() => buyRaw(10)}
                          className="w-full py-2 bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 text-xs rounded-lg hover:bg-yellow-600/30 transition-all font-bold"
                        >
                          🧪 Buy 10kg Raw (${(10 * selectedNodeData.buyPrice).toLocaleString()} clean)
                        </button>
                        <button
                          onClick={() => buyRaw(50)}
                          className="w-full py-2 bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 text-xs rounded-lg hover:bg-yellow-600/30 transition-all font-bold"
                        >
                          🧪 Buy 50kg Raw (${(50 * selectedNodeData.buyPrice).toLocaleString()} clean)
                        </button>
                      </>
                    )}
                    {selectedNodeData.id === 'bangkok' && state.rawKg > 0 && (
                      <button
                        onClick={convertCompound}
                        className="w-full py-2 bg-purple-600/20 border border-purple-600/50 text-purple-400 text-xs rounded-lg hover:bg-purple-600/30 transition-all font-bold"
                      >
                        🧪 Convert Raw → Refined (at safe house)
                      </button>
                    )}
                    {selectedNodeData.type === 'market' && selectedNodeData.priceIndex > 0 && state.refinedKg > 0 && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <div className="text-xs text-green-400 font-bold mb-1">💰 Market Price</div>
                        <div className="text-sm text-green-400">${selectedNodeData.priceIndex.toLocaleString()}/kg refined</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {state.refinedKg}kg × ${selectedNodeData.priceIndex.toLocaleString()} = ${(state.refinedKg * selectedNodeData.priceIndex).toLocaleString()} dirty
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Available Routes */}
                  {availableEdges.length > 0 && (
                    <div>
                      <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Routes From Here</h4>
                      <div className="space-y-1.5">
                        {availableEdges.map(edge => {
                          const dest = getNode(edge.to);
                          const transport = TRANSPORT[edge.mode];
                          const heat = state.nodeHeat[edge.from] || 0;
                          const risk = calculateEffectiveRisk(edge.baseRisk, heat, state.globalAttention, 50, 0, transport.concealment, 0);
                          return (
                            <div key={edge.id} className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/30">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-white font-medium">{dest?.name}</span>
                                <span className="text-[10px] text-gray-500">{transport.icon} {transport.label}</span>
                              </div>
                              <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                                <span>⏱ {edge.baseHours}h</span>
                                <span className={risk > 30 ? 'text-red-400' : risk > 15 ? 'text-yellow-400' : 'text-green-400'}>
                                  ⚠️ {risk.toFixed(1)}% risk
                                </span>
                                <span>💵 ${edge.costPerKg}/kg</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm mt-8">
                  <div className="text-3xl mb-2">🗺️</div>
                  <p>Click a node on the map to view details</p>
                </div>
              )}

              {/* Recent Events */}
              <div className="p-4 border-t border-gray-800">
                <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">📡 Intel Feed</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {state.events.slice(0, 10).map(evt => (
                    <div key={evt.id} className={`text-[10px] p-2 rounded border ${
                      evt.category === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      evt.category === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                      'bg-gray-800/30 border-gray-700/30 text-gray-400'
                    }`}>
                      <span className="opacity-50">D{evt.day}</span> {evt.title}: {evt.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'contacts' && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-4">
              {NPCS.map(npc => {
                const contact = state.contacts.find(c => c.npcId === npc.id);
                if (!contact) return null;
                return (
                  <div key={npc.id} className="bg-gray-900/80 rounded-xl border border-gray-700/50 overflow-hidden">
                    <div className="p-4" style={{ borderColor: npc.color + '40', borderWidth: '1px' }}>
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{npc.emoji}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg" style={{ color: npc.color }}>{npc.name}</h3>
                            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">"{npc.alias}"</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{npc.title}</p>
                          <p className="text-xs text-gray-400 mt-2">{npc.description}</p>

                          {/* Reputation Bar */}
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-400">Reputation</span>
                              <span className="text-xs font-bold" style={{ color: npc.color }}>
                                {getRepLabel(contact.tier)} ({contact.reputation}/100)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${contact.reputation}%`, backgroundColor: npc.color }}
                              />
                            </div>
                          </div>

                          {/* SMS Messages */}
                          <div className="mt-3 bg-gray-800/50 rounded-lg p-3">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Latest Transmission</div>
                            <p className="text-xs text-gray-300 italic">
                              "{npc.smsMessages[Math.floor(state.gameDay / 3) % npc.smsMessages.length]}"
                            </p>
                          </div>

                          {/* Inner Circle Perk */}
                          {contact.tier === 'inner_circle' && (
                            <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                              <span className="text-[10px] text-yellow-400 font-bold">⭐ INNER CIRCLE PERK:</span>
                              <span className="text-xs text-yellow-400/80 ml-1">{npc.innerCirclePerk}</span>
                            </div>
                          )}

                          {/* Rep Actions */}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => changeRep(npc.id, 5)}
                              className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded hover:border-green-500/50 hover:text-green-400 transition-all"
                            >
                              📦 Send Gift (+5 rep, $2k)
                            </button>
                            <button
                              onClick={() => {
                                if (state.dirtyCash < 1000) { notify('❌ Need $1k dirty cash'); return; }
                                setState(prev => ({ ...prev, dirtyCash: prev.dirtyCash - 1000 }));
                                changeRep(npc.id, 3);
                                notify(`💬 Laughed at ${npc.alias}'s joke`);
                              }}
                              className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded hover:border-green-500/50 hover:text-green-400 transition-all"
                            >
                              😂 Laugh at Joke (+3 rep)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Active Shipments */}
              <div className="bg-gray-900/80 rounded-xl border border-gray-700/50 p-4">
                <h3 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3">🚚 Active Shipments</h3>
                {state.shipments.filter(s => s.status === 'in_transit').length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No active shipments. Launch one from the map.</p>
                ) : (
                  <div className="space-y-2">
                    {state.shipments.filter(s => s.status === 'in_transit').map(s => {
                      const leg = s.legs[s.currentLegIndex];
                      const edge = ROUTES.find(r => r.id === leg.edgeId);
                      const progress = leg.hoursElapsed / leg.totalHours;
                      return (
                        <div key={s.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-white font-bold">{s.currentKg}kg Emerald Compound</span>
                            <span className="text-[10px] text-gray-500">Leg {s.currentLegIndex + 1}/{s.legs.length}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
                            <span>{s.routeNames.join(' → ')}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-500">
                            <span>⚠️ Risk: {leg.riskSnapshot.toFixed(1)}%</span>
                            <span>⏱ {Math.round(leg.hoursElapsed)}/{leg.totalHours}h</span>
                            <span>{TRANSPORT[leg.vehicle].icon} {TRANSPORT[leg.vehicle].label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Launder Jobs */}
              <div className="bg-gray-900/80 rounded-xl border border-gray-700/50 p-4">
                <h3 className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-3">🏦 Laundering Queue</h3>
                {state.launderJobs.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No active laundering jobs.</p>
                ) : (
                  <div className="space-y-2">
                    {state.launderJobs.map(j => (
                      <div key={j.id} className={`rounded-lg p-3 border ${
                        j.status === 'complete' ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-800/50 border-gray-700/30'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-white">{j.method}</span>
                          <span className={`text-xs font-bold ${j.status === 'complete' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {j.status === 'complete' ? '✅ COMPLETE' : '⏳ PENDING'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          ${j.amountIn.toLocaleString()} → ${Math.floor(j.amountIn * (1 - j.feePct / 100)).toLocaleString()} clean ({j.feePct}% fee)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Log */}
              <div className="bg-gray-900/80 rounded-xl border border-gray-700/50 p-4">
                <h3 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-3">📜 Event Log</h3>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {state.events.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No events yet.</p>
                  ) : (
                    state.events.map(evt => (
                      <div key={evt.id} className={`text-xs p-2 rounded border ${
                        evt.category === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        evt.category === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                        evt.category === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                        'bg-gray-800/30 border-gray-700/30 text-gray-400'
                      }`}>
                        <span className="opacity-50 mr-1">Day {evt.day}</span>
                        <span className="font-bold">{evt.title}</span> — {evt.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ SHIPMENT PLANNER MODAL ═══ */}
      {showPlanner && <ShipmentPlannerModal state={state} onClose={() => setShowPlanner(false)} onCreate={createShipment} />}

      {/* ═══ LAUNDER MODAL ═══ */}
      {showLaunder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLaunder(false)}>
          <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-yellow-400 font-bold text-lg mb-1">🏦 Launder Dirty Cash</h2>
            <p className="text-xs text-gray-400 mb-4">Available: <span className="text-yellow-400 font-bold">${state.dirtyCash.toLocaleString()}</span> dirty cash</p>
            <div className="space-y-2">
              {LAUNDER_METHODS.map(m => {
                const available = (m.id !== 'tour_shows' || state.contacts.find(c => c.npcId === 'yayaya')?.reputation! >= 50) &&
                  (m.id !== 'shell_company' || state.globalAttention < 40) &&
                  (m.id !== 'offshore' || state.contacts.find(c => c.npcId === 'blackhujus')?.tier === 'inner_circle');
                return (
                  <button
                    key={m.id}
                    onClick={() => available && startLaunder(m.id)}
                    disabled={!available}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      available
                        ? 'bg-gray-800/50 border-gray-700 hover:border-yellow-500/50 hover:bg-gray-800'
                        : 'bg-gray-800/20 border-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white font-medium">{m.icon} {m.name}</span>
                      <span className="text-xs text-yellow-400 font-bold">{m.feePct}% fee</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                      <span>⏱ {m.delayHours === 0 ? 'Instant' : `${m.delayHours}h delay`}</span>
                      <span>🔍 Audit: {m.auditRisk}%</span>
                      <span>{m.requirement}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowLaunder(false)} className="w-full mt-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ═══ INTERDICTION EVENT MODAL ═══ */}
      {activeEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/10">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h2 className="text-red-400 font-bold text-lg">{activeEvent.title}</h2>
              <p className="text-sm text-gray-300 mt-2">{activeEvent.message}</p>
            </div>
            <div className="text-center text-xs text-gray-500 mb-4">⏱ {eventTimer}s to decide</div>
            <div className="space-y-2">
              {activeEvent.choices?.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => resolveEventChoice(choice.action)}
                  className={`w-full py-3 rounded-lg border text-sm font-bold transition-all ${
                    choice.action === 'burn'
                      ? 'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20'
                      : choice.action === 'risk'
                      ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20'
                      : 'bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20'
                  }`}
                >
                  {choice.label}
                  {choice.riskPct !== undefined && <span className="text-xs opacity-60 ml-2">({choice.riskPct}% success)</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-gray-900/90 border-t border-gray-800 px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-600 shrink-0">
        <span>📍 {state.shipments.filter(s => s.status === 'in_transit').length} active shipments</span>
        <span>Deliveries: {state.deliveriesCompleted} | Lost: {state.convoysLost}</span>
        <span>Shadow Routes: The Emerald Compound Trail — Fictional Game</span>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHIPMENT PLANNER MODAL
// ═══════════════════════════════════════════════════════════════

function ShipmentPlannerModal({ state, onClose, onCreate }: {
  state: PlayerState;
  onClose: () => void;
  onCreate: (route: string[], kg: number, vehicle: TransportMode) => void;
}) {
  const [selectedRoute, setSelectedRoute] = useState<string[]>(['bangkok']);
  const [kg, setKg] = useState(10);
  const [vehicle, setVehicle] = useState<TransportMode>('pickup');

  const addNode = (nodeId: string) => {
    if (selectedRoute.includes(nodeId)) return;
    const lastNode = selectedRoute[selectedRoute.length - 1];
    const edge = ROUTES.find(r => r.from === lastNode && r.to === nodeId);
    if (!edge) return;
    setSelectedRoute([...selectedRoute, nodeId]);
  };

  const removeNode = (index: number) => {
    if (index === 0) return;
    setSelectedRoute(selectedRoute.filter((_, i) => i !== index));
  };

  const lastNode = selectedRoute[selectedRoute.length - 1];
  const nextEdges = getEdgesFrom(lastNode).filter(e => !selectedRoute.includes(e.to));

  const totalHours = selectedRoute.slice(0, -1).reduce((sum, node, i) => {
    const edge = ROUTES.find(r => r.from === node && r.to === selectedRoute[i + 1]);
    return sum + (edge?.baseHours || 0);
  }, 0);

  const totalCost = selectedRoute.slice(0, -1).reduce((sum, node, i) => {
    const edge = ROUTES.find(r => r.from === node && r.to === selectedRoute[i + 1]);
    return sum + (edge?.costPerKg || 0) * kg;
  }, 0);

  const avgRisk = selectedRoute.slice(0, -1).reduce((sum, node, i) => {
    const edge = ROUTES.find(r => r.from === node && r.to === selectedRoute[i + 1]);
    if (!edge) return sum;
    const transport = TRANSPORT[vehicle];
    const heat = state.nodeHeat[node] || 0;
    return sum + calculateEffectiveRisk(edge.baseRisk, heat, state.globalAttention, kg, 0, transport.concealment, 0);
  }, 0) / Math.max(1, selectedRoute.length - 1);

  const survivalPct = Math.pow(1 - avgRisk / 100, selectedRoute.length - 1) * 100;

  const destNode = getNode(selectedRoute[selectedRoute.length - 1]);
  const expectedRevenue = destNode ? kg * destNode.priceIndex : 0;
  const expectedProfit = expectedRevenue - totalCost;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-green-500/30 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-green-400 font-bold text-lg mb-4">📋 New Shipment Planner</h2>

        {/* Route Builder */}
        <div className="mb-4">
          <h3 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Route</h3>
          <div className="flex flex-wrap items-center gap-1 mb-3">
            {selectedRoute.map((nodeId, i) => {
              const node = getNode(nodeId);
              return (
                <div key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-gray-600 text-xs">→</span>}
                  <button
                    onClick={() => removeNode(i)}
                    className={`px-2 py-1 rounded text-xs font-bold border ${
                      i === 0 ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' :
                      'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400'
                    }`}
                  >
                    {node?.shortName} {i > 0 && '×'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add next node */}
          {nextEdges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {nextEdges.map(edge => {
                const dest = getNode(edge.to);
                return (
                  <button
                    key={edge.id}
                    onClick={() => addNode(edge.to)}
                    className="px-2 py-1 bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded hover:border-green-500/50 hover:text-green-400 transition-all"
                  >
                    + {dest?.shortName}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cargo & Vehicle */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Cargo (kg)</h3>
            <input
              type="range"
              min={1}
              max={Math.min(state.refinedKg, TRANSPORT[vehicle].capacity)}
              value={kg}
              onChange={e => setKg(Number(e.target.value))}
              className="w-full accent-green-500"
            />
            <div className="text-sm text-green-400 font-bold mt-1">{kg}kg refined</div>
            <div className="text-[10px] text-gray-500">Available: {state.refinedKg}kg | Max: {TRANSPORT[vehicle].capacity}kg</div>
          </div>
          <div>
            <h3 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Vehicle</h3>
            <div className="space-y-1">
              {(Object.keys(TRANSPORT) as TransportMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setVehicle(mode)}
                  className={`w-full text-left px-2 py-1 rounded text-xs border transition-all ${
                    vehicle === mode
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {TRANSPORT[mode].icon} {TRANSPORT[mode].label} (cap: {TRANSPORT[mode].capacity}kg)
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mb-4">
          <h3 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">Run Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 text-xs">Transport Cost</span>
              <div className="text-yellow-400 font-bold">${totalCost.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Travel Time</span>
              <div className="text-white font-bold">{totalHours}h ({(totalHours / 24).toFixed(1)} days)</div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Avg Risk/Leg</span>
              <div className={`font-bold ${avgRisk > 30 ? 'text-red-400' : avgRisk > 15 ? 'text-yellow-400' : 'text-green-400'}`}>
                {avgRisk.toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Survival %</span>
              <div className={`font-bold text-lg ${survivalPct > 70 ? 'text-green-400' : survivalPct > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {survivalPct.toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Expected Revenue</span>
              <div className="text-green-400 font-bold">${expectedRevenue.toLocaleString()} dirty</div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Expected Profit</span>
              <div className={`font-bold ${expectedProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${expectedProfit.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl text-sm font-bold hover:bg-gray-700 transition-all">
            Cancel
          </button>
          <button
            onClick={() => selectedRoute.length >= 2 && onCreate(selectedRoute, kg, vehicle)}
            disabled={selectedRoute.length < 2 || kg > state.refinedKg || totalCost > state.dirtyCash}
            className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl text-sm font-bold hover:from-green-500 hover:to-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 CONFIRM RUN
          </button>
        </div>
      </div>
    </div>
  );
}
