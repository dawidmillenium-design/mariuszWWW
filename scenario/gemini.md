# SHADOW ROUTES: The Green Powder Trail
## Game Design Document & Technical Architecture v1.0

*A fictional, satirical strategy/management browser game about risk, logistics, and hubris. All contraband in-game is the fictional "Emerald Compound." All characters, organizations, and events are invented. The game is a math-driven risk simulator — the fantasy is logistics and tension, not instructions.*

---

# 1. VISION & DESIGN PILLARS

**Elevator pitch:** *Cartel Tycoon* meets *Papers, Please* tension, delivered as a persistent browser-based logistics sim. You are not a street dealer — you are the invisible hand routing a volatile, luminous green powder across five continents, one spreadsheet decision away from ruin.

**Design pillars:**

1. **Every route is a bet.** No shipment is safe. The player is always pricing risk, never eliminating it.
2. **The map is the UI.** All decisions happen on or around a living world map — routes pulse, heat glows red, convoys crawl in real time.
3. **Bottlenecks are characters.** The three faction leaders ARE the mechanics: YAYAYAhujUS gates Asia, Mariusz gates the road into Western shipping lanes, BLACKHUJUS gates the raw supply itself.
4. **Money is dirty until proven clean.** The second half of the economy — laundering — is a game in itself.
5. **Dark comedy, serious math.** YAYAYAhujUS's jokes, Mariusz's deadpan SMS messages, and the Imperator's menacing proclamations sit on top of a ruthless spreadsheet.

**Tone & art direction (from key art):**
- **Black Sovereign key art:** neon-noir jungle, magenta/cyan rim light, gold throne, pirate flag → used for loading screens, BLACKHUJUS screens, "empire view" victory states.
- **Mariusz key art:** grounded photorealism, container port, overcast skies, "POLSKA" truck → used for the European logistics screens and event art.
- **Green Route map art:** hand-inked comic travel poster → direct reference for the main world map rendering style (illustrated, not satellite).
- **Pixel sprite:** the player's on-map avatar token, retro minigames, and low-spec/mobile "Pixel Mode."

---

# 2. CORE GAMEPLAY LOOP

```
        ┌──────────────────────────────────────────────────────────┐
        │                     ONE CYCLE (~1 session)               │
        └──────────────────────────────────────────────────────────┘

  1. ACQUIRE          2. ROUTE             3. CONVERT          4. SELL
  Buy raw Emerald     Plot path across     Refine raw → street  Move product
  Compound at origin  nodes; pick vehicles, grade at a safe     in an end
  (VN–KH border) or   bribes, cover cargo  house (loss %,       market city
  from BLACKHUJUS     (cost vs. heat)      time, heat spike)    (payout ×
  at premium                                                       market index)
        │                  │                    │                  │
        ▼                  ▼                    ▼                  ▼
  Dirty cash out     RISK ROLL per leg:    Safe house mgmt    DIRTY CASH in
                     interdiction event?                        (cannot buy
                     success → heat ↑                           assets!)
                            │
                            ▼
                     5. LAUNDER
                     Wash dirty cash via fronts & fixers (fee %, delay,
                     audit risk) → CLEAN CASH → buy trucks, safe houses,
                     bribes, upgrades → loop back to 1 at larger scale.
```

**Session rhythm:** real-time with pause + 1×/2×/4× speed. A full origin→Boston run at 1× takes ~25 real minutes (compressed travel). Tick-based simulation (1 tick = 1 game-minute; 1 game-day = 720 ticks ≈ 12 real minutes at 1×).

**Long-term meta:** player grows from one motorbike courier on the VN–KH border to a network operator running parallel convoys on the primary corridor plus secondary branches (Pattaya, Turkey, Rio), juggling three egos who all want a cut.

---

# 3. THE WORLD MAP & ROUTE NETWORK

## 3.1 Node types

| Type | Function |
|---|---|
| **Origin** | Buy raw compound (Vietnam–Cambodia border, or BLACKHUJUS's ports) |
| **Transit** | Pass-through; bribe/wait/refuel; heat accumulates here |
| **Hub** | Large city; safe houses, conversion, warehouses, vehicle leasing |
| **Port** | Sea legs; container concealment minigame; customs risk |
| **Market** | Sell refined product; has a fluctuating Price Index |

## 3.2 The Primary Route — "The Green Route"

| # | Node | Type | Region | Function |
|---|------|------|--------|----------|
| 1 | **VN–KH Border (Bavet/Moc Bai)** | Origin | SE Asia | Raw purchase, cheapest price, lowest security |
| 2 | **Bangkok** | Hub | Thailand | First safe house, first conversion, YAYAYAhujUS's home turf |
| 3 | **Chittagong (Bangladesh)** | Port | South Asia | Sea leg hub, congestion delays |
| 4 | **Mumbai (India)** | Hub | South Asia | Big safe house, cheap conversion labor, heat-sensitive |
| 5 | **Bandar Abbas (Iran)** | Port/Transit | Middle East | Bribe economy, land bridge |
| 6 | **Batumi (Georgia)** | Port | Black Sea | Free-port, corruption discount, the famous "Batumi shuffle" |
| 7 | **Odesa (Ukraine)** | Transit | Black Sea | War-risk modifier zone: cheap, chaotic, volatile events |
| 8 | **Białystok (Poland)** | Hub | EU East | EU border crossing — **the single highest-risk land leg** |
| 9 | **Rotterdam (Port)** | Port | Netherlands | Mariusz's kingdom; container injection into western shipping |
| 10 | **Boston (USA)** | Market | North America | Primary end market; highest Price Index |

## 3.3 Secondary Branches

| Branch | Path | Profile |
|---|---|---|
| **Pattaya (Thailand)** | Bangkok → Pattaya | Short, low payout, very low risk — the "tutorial-grade" revenue stream |
| **Turkey** | Iran → Istanbul | Mid payout, opens a second EU door (future expansion hook) |
| **Rio de Janeiro** | Batumi → transatlantic → Rio | Long sea leg, pays in bulk, but a fixed **15% tribute** to BLACKHUJUS |

## 3.4 Leg risk table (baseline values)

| Leg | Mode | Base Risk | Base Time | Notes |
|---|---|---|---|---|
| VN–KH Border → Bangkok | Land (bike/pickup) | 8% | 6h | Jungle roads, patrol RNG |
| Bangkok → Chittagong | Sea (small freighter) | 12% | 18h | Weather events |
| Chittagong → Mumbai | Sea | 14% | 24h | Congestion queue minigame |
| Mumbai → Bandar Abbas | Sea | 16% | 30h | Naval patrol corridor |
| Bandar Abbas → Batumi | Land (truck) | 18% | 36h | Mountain passes; Turkey branch splits here |
| Batumi → Odesa | Sea (short hop) | 15% | 12h | Black Sea chaos modifier |
| Odesa → Białystok | Land (truck) | **30%** | 24h | EU external border — the wall |
| Białystok → Rotterdam | Land (Mariusz's rigs) | 12% | 18h | Inside Schengen — risk drops hard |
| Rotterdam → Boston | Sea (ocean container) | 22% | 96h | Customs scan lottery — big money, big audit |
| **Full run total** | — | **~82% survival** | ~11 game-days | Before modifiers; design target |

*Design target:* an unmodified full run should survive ~4 out of 5 times. The player's upgrades, bribes, and timing decisions push survival toward 95%+ at a cost of margin — that's the core tension.

---

# 4. CHARACTERS

## 4.1 YAYAYAhujUS "The Joker" (formerly Mr. Ping) — Gatekeeper of Asia

- **Domain:** all SE/South Asian nodes (nodes 1–4 + Pattaya).
- **Personality:** disarmingly funny, tells exactly one joke before every deal — the joke's quality is a hidden die roll that sets a mission modifier ("Joker's Gambit," see §5.6). Associates laugh because the alternative is worse.
- **Front business:** launders through entertainment ventures — he famously bankrolls touring stage shows across Germany, and his "touring talent" contracts are a laundering vehicle the player can buy into at higher reputation.
- **Mechanics:** reputation with him discounts Asian safe-house costs, unlocks Bangkok conversion labs, and gates the Pattaya branch. Fall out of favor and Asian bribe prices double overnight.
- **Dialogue style:** punchlines as power moves. *"Why did the container cross the ocean? Because no one checked the manifest. …You will check the manifest, yes?"*

## 4.2 Mariusz WWW ("The Merhujus") — The Rotterdam Bottleneck

- **Domain:** EU road network + Port of Rotterdam container yards (nodes 8–9).
- **Personality:** gritty, exhausted, chain-drinks coffee, communicates in one-line SMS messages. Patriotic truck decal, patched coveralls, zero sense of humor — which makes him YAYAYAhujUS's favorite audience.
- **Mechanics:** he IS the leasing system for European heavy transport. His fleet tiers (Sprinter → TIR rig → "Ghost Convoy") define your EU capacity. His **Port Contact Level** sets your Rotterdam customs-avoidance ceiling. He takes a flat per-pallet fee — your margin lives and dies by his rate card.
- **Narrative function:** the player's reality check. When you over-expand, Mariusz is the one who texts: *"Too many pallets. I am one man. With one back."*

## 4.3 The Imperator BLACKHUJUS (Alias: Black Sovereign) — Supplier of Last Resort

- **Domain:** raw ingredient markets across Africa and the Americas; controls the Rio branch by sheer gravity.
- **Personality:** imperial, theatrical, sits on a golden throne in a neon jungle compound surrounded by the trappings of a pirate king. Speaks in proclamations.
- **Mechanics:** 
  - **Tribute system:** every 7 game-days you owe a cut of gross revenue. Pay on time → supply price drops, "Sovereign's Favor" buffs. Miss a tribute → **Squeeze**: raw prices +40%, then a sabotage event, then a hostile takeover attempt (soft game-over spiral).
  - **Bulk supply:** at high favor, he sells raw compound at 30% below origin price, in volumes the VN–KH border can't match — tempting you into dependency.
- **Narrative function:** the endgame question — partner, or rival? The final campaign act lets the player attempt to break tribute (very hard) or accept junior-partner status forever.

## 4.4 Kenji — The Handler (tutorial & early-game contact)

Kenji is YAYAYAhujUS's fixer in Bangkok: mid-level, sharp, patient, the player's first friend in the network. He runs the tutorial, hands out the first three contracts, and later becomes the in-game notification voice for Asian events. (He's the only character who explains mechanics in plain language — everyone else speaks in threats and jokes.)

---

# 5. GAME MECHANICS — DETAILED

## 5.1 Resources

| Resource | Description |
|---|---|
| **Dirty Cash ($D)** | Revenue from sales. Can pay bribes and street costs; **cannot** buy permanent assets. Carrying large $D attracts attention. |
| **Clean Cash ($C)** | Laundered money. Buys trucks, safe houses, upgrades, pays crew salaries. |
| **Raw Compound (kg)** | Purchased inventory. Value-locked; worthless until converted. |
| **Refined Compound (kg)** | Sellable product. Conversion ratio: **1 kg raw → 0.7 kg refined** (upgradeable to 0.85). |
| **Heat (per node, 0–100)** | How watched a node is. See §5.4. |
| **Global Attention (0–100)** | Cross-border agency interest. Slow-decaying, driven by volume + busts. Gates endgame difficulty. |
| **Reputation (×3)** | Per-character standing: Hostile / Tolerated / Trusted / Inner Circle. |

## 5.2 Risk vs. Reward System

**Each leg resolves an Interdiction Roll when the convoy crosses it:**

```
Effective Risk = clamp( BaseRisk
                        + NodeHeat × 0.15
                        + GlobalAttention × 0.05
                        + VolumeModifier        (bigger loads are louder)
                        − BribeCoverage         (0–12%)
                        − ConcealmentRating     (vehicle/cover cargo, 0–10%)
                        − ContactPerks          (Mariusz port level, etc.)
                        + EventModifiers,  1%, 95% )

Roll d100. Roll < EffectiveRisk → INTERDICTION EVENT.
```

**Interdiction outcomes (weighted):**

| Outcome | Weight | Result |
|---|---|---|
| Shakedown | 40% | Lose cash bribe (10–25% of convoy value), cargo intact, +Heat |
| Seizure | 30% | Lose the cargo on that leg, +large Heat at node |
| Crew arrest | 20% | Lose cargo + driver asset, unlocks "lawyer fees" sink |
| Informant flip | 10% | Worst: +15 Global Attention, a random safe house is burned |

**Reward side of the equation — the Price Index by market:**

| Market | Base Price / kg refined | Volatility |
|---|---|---|
| Pattaya | $9,000 | Low |
| Istanbul | $14,000 | Medium |
| Rio | $18,000 | High (−15% tribute) |
| Mumbai (local) | $11,000 | Low |
| **Boston** | **$26,000** | Medium-high |

**Design rule:** price roughly scales with cumulative risk and distance. A Bangkok→Pattaya run nets ~$6k/kg after costs; a full run to Boston nets ~$14k/kg after all costs and average losses — more than double, at ~5× the catastrophic-failure probability. The player always has a *safe* option; greed is voluntary.

**Worked example (100 kg raw, full route to Boston, mid-game):**

| Line item | Amount |
|---|---|
| Raw purchase (VN–KH border, 100 kg @ $2,000) | −$200,000 $C equivalent (cash purchase) |
| Transport & bribes, all legs | −$95,000 |
| Conversion: 100 kg raw → 70 kg refined | −$35,000 (safe house fee) |
| Expected interdiction loss (avg ~8 kg over full run) | −8 kg |
| Sell 62 kg @ $26,000 in Boston | +$1,612,000 $D |
| Laundering fee (20% tier) | −$322,400 |
| **Net clean profit** | **≈ $959,600** on ~$330k invested |

That ~3× clean multiplier per 11-day cycle, minus tribute and crew salaries, is the engine of the mid-game.

## 5.3 Economy Systems

**A. Transport modes** (each leg has allowed modes):

| Mode | Capacity | Speed | Concealment | Cost basis |
|---|---|---|---|---|
| Motorbike courier | 5 kg | Fast | High | $40/kg/leg |
| Pickup/van | 40 kg | Fast | Medium | $25/kg/leg |
| Small freighter | 500 kg | Slow | Medium | $12/kg/leg |
| TIR truck (Mariusz fleet) | 200 kg | Medium | Medium-high | $18/kg/leg |
| Ocean container | 2,000 kg | Very slow | Roll-based* | $6/kg/leg |

\* **Container Concealment minigame:** at ports, player allocates cargo among cover-commodity containers (rice, textiles, machine parts) on a packing grid. Better spread + matched manifest = higher concealment roll vs. the port's Scan Level. Fast, tactile, and thematically it *feels* like the map art.

**B. Bribes:** each node has named officials with tiered pricing. Bribes are per-shipment heat suppression and are a money sink that scales with volume. Mariusz's perk reduces Rotterdam/Białystok bribe costs by up to 50%.

**C. Safe houses:** purchased with $C at Hubs. Each has: Conversion Rate, Conversion Loss, Capacity, Burn Risk. Burned safe houses (from informant events) are lost with their inventory.

**D. Laundering:**

| Method | Fee | Delay | Audit risk | Unlocked by |
|---|---|---|---|---|
| Courier drop | 30% | Instant | None | Start |
| Cash business front (owned) | 15% | 2 game-days | Low | $C purchase |
| YAYAYAhujUS's touring shows | 12% | 3 game-days | Low | YAYAYAhujUS: Trusted |
| Shell company network | 8% | 5 game-days | Audit event possible | $C + Global Attention < 40 |
| BLACKHUJUS's offshore ledger | 5% | 1 game-day | None — but deepens Tribute dependency | BLACKHUJUS: Inner Circle |

Audit events at high Global Attention can freeze shell-company funds — the classic "don't put everything in one wash" lesson.

## 5.4 The Heat System

**Per-node Heat (0–100):**
- **+Heat:** every shipment through a node (+2 base, +1 per 50 kg), interdiction events (+8 to +20), flashy spending in a region, ignored local events.
- **−Heat:** decay of 1 point / 6 game-hours when node is unused, "cooling" bribes, laying low (no shipments at all for a full game-day = extra decay tick).
- **Thresholds:** 
  - **0–29 Cold** — normal operation.
  - **30–59 Warm** — patrol events appear; bribe prices +25%.
  - **60–84 Hot** — effective risk multiplier ×1.5 on legs touching this node; roadblock events.
  - **85–100 Burning** — node effectively closed: guaranteed interdiction roll at 60%+ risk; any safe house there has a daily Burn check.

**Global Attention (0–100):** the slow meta-meter. +2 per seizure, +15 per informant flip, +1 per 500 kg moved anywhere. Decays only 1 point per game-day. At 60+, the "Joint Task Force" arc begins: random audits, Mariusz gets questioned (his fees rise), and the campaign endgame triggers. This is the pacing valve that stops infinite scaling.

## 5.5 Progression & Win/Loss

**Tech/upgrade tracks:** Vehicles (capacity, concealment), Safe houses (ratio, burn resistance), Crew (drivers, lawyers, accountants), Network (bribe discounts, extra routes), Cover (front businesses that also generate small legit income).

**Campaign win condition ("Globally Bound"):** retire with $C 10,000,000 clean in an offshore account AND Global Attention below 50 when you trigger the "Disappear" ending. Alternate endings: *Junior Partner* (submit to BLACKHUJUS), *Kingpin* (break the Imperator — win a risky multi-stage endgame operation), *Pixel Legend* (hidden retro ending unlocked in Pixel Mode).

**Loss:** bankruptcy, or a full network collapse (all safe houses burned + Global Attention 100 = "Rolled Up" game over screen — throne art, flag at half-mast).

## 5.6 NPC Reputation & Signature Mechanics

| NPC | Rep gained by | Rep lost by | Inner Circle perk |
|---|---|---|---|
| YAYAYAhujUS | On-time Asian deliveries, laughing at jokes (dialogue choices) | Failing Asian legs, ignoring his missions | **Joker's Gambit:** before each mission, his joke rolls a random buff/curse (e.g., "Knock knock" = −10% risk on one leg; a bad pun = +5% heat but +20% payout) |
| Mariusz | Consistent Rotterdam volume, prompt payment | Overloading him, late fees | **Ghost Convoy:** one EU leg per week runs at 0 added risk |
| BLACKHUJUS | Tribute punctuality, bulk purchases | Any missed tribute | **Sovereign's Mandate:** raw at −30%, Rio tribute waived |

**Missions:** each NPC issues contracts (deliver X kg to Y by day Z) with bonus rewards. Mission generation uses route-difficulty scaling so contracts always push the player one node past their comfort zone.

## 5.7 Random Event Deck (sample of 40+ events)

- *"Monsoon at Chittagong"* — sea leg delayed 12h, or pay to reroute.
- *"New scanner at Rotterdam"* — Scan Level +2 for 3 days (Mariusz warns you 24h early if Trusted).
- *"The Joker is in town"* — all Asian bribes half price for 24h; he expects a gift.
- *"Driver's strike in Białystok"* — land leg paused unless you pay triple.
- *"A joke lands badly"* — minor YAYAYAhujUS rep loss; comedic beat.
- *"The Imperator requests an audience"* — tribute due early; refuse and face the Squeeze.

---

# 6. UI/UX LAYOUT (Browser, 16:9-first, responsive down to tablet)

## 6.1 Main Map Screen (default state)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOP BAR  $D 1.6M │ $C 2.2M │ RAW 240kg │ REF 88kg │ ⚠ATTENTION 34 │ ⏸ 1×2×│
├────────────┬─────────────────────────────────────────────────┬───────────┤
│            │                                                 │           │
│  CONTACTS  │            WORLD MAP (comic-ink style)          │  LEDGER   │
│  ───────── │                                                 │  ───────  │
│  🃏 Joker  │   ○────○····○────○     animated route lines     │ Active    │
│  ▓▓▓▓░ Tr. │  BKK  BOM  etc.  (dash = planned, solid = live) │ shipments │
│            │                                                 │ list with │
│  🚚 Mariusz│   heat glow: node halo color = heat state       │ per-leg   │
│  ▓▓▓▓▓ I.C.│   convoy tokens crawl along lines (pixel avatar)│ progress  │
│            │                                                 │           │
│  👑 Imper. │   click node → Node Panel (below)               │ Filters:  │
│  ▓▓░░ Tol. │                                                 │ by route/ │
│            │                                                 │ by status │
│ [Missions] │                                                 │           │
├────────────┴─────────────────────────────────────────────────┴───────────┤
│ BOTTOM DOCK: [New Shipment] [Safe Houses] [Fleet] [Launder] [Events 🔔2] │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Map rendering:** illustrated world map in the style of the "Green Route" poster art; nodes as inked icons with halo glow (green→amber→red = heat). Live convoys shown as the pixel-art avatar sprite crawling along route lines.
- **Contacts rail (left):** the three leaders as portrait cards (key art), rep bars, current mood emoji, [Missions] button per contact.
- **Ledger (right):** sortable live shipment list — cargo, route, ETA, per-leg risk readout. This is the game's heartbeat; a player mid-run watches this panel.

## 6.2 Node Panel (click a node)

```
┌─ BANGKOK — HUB ────────────────────────── HEAT: 41 WARM 🟠 ─┐
│ Safe house: YES (capacity 60/100)   Conversion: 0.75 ratio   │
│ Bribes: Police Col. Sombat — $4k covers next 3 shipments     │
│ Local events: "The Joker is in town" (14h remaining)         │
│ [Buy Raw] [Convert] [Route Through ▸] [Lay Low]              │
└──────────────────────────────────────────────────────────────┘
```

## 6.3 Shipment Planner (modal over dimmed map)

Step wizard: **Cargo amount → Route (drag waypoints on map) → Vehicle per leg → Bribes toggles → Summary card** showing: total cost, expected survival % (computed from the risk formula), expected profit range, "CONFIRM RUN" button styled like a stamped manifest. The survival % readout is deliberately shown — this is a game about *priced* risk.

## 6.4 Event Pop-up

```
┌─────────────────────────────────────────┐
│  ⚠ INTERDICTION — ODESA → BIAŁYSTOK     │
│  ─────────────────────────────────────  │
│  Border patrol stops the convoy.        │
│  Mariusz: "Not my driver. Your call."   │
│                                         │
│  [Pay shakedown $18k]  [Risk the run]   │
│  [Burn the cargo]                       │
│                            ⏱ 00:20      │
└─────────────────────────────────────────┘
```

Timed choices (pause-mode exempt) create the game's signature adrenaline spikes. Art treatment: comic-panel frame, character portrait corner.

## 6.5 Dialogue UI (character missions)

Visual-novel style bottom-third dialogue box, full-body character art (throne art for BLACKHUJUS, port art for Mariusz, neon jungle for YAYAYAhujUS), typewriter text, 2–3 response options that affect reputation. The Joker's jokes always include a [Laugh] and [Stare silently] option — both are valid, both are read.

## 6.6 UX principles

- **One-glance state:** a player should read world state in <3 seconds from map halos + top bar alone.
- **Every number is inspectable:** hovering any risk % shows the full formula breakdown (builds trust in fairness).
- **Mobile/tablet:** collapses to map + bottom sheet panels; "Pixel Mode" sprite rendering as the low-power display option (uses the pixel avatar set).

---

# 7. TECHNICAL ARCHITECTURE

## 7.1 Stack recommendation

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite | Ecosystem, hiring pool, fast iteration |
| **Map rendering** | Canvas 2D via **PixiJS** (WebGL accel) | Smooth animated routes/convoys over a painted map; falls back to SVG for accessibility mode |
| **UI components** | Tailwind CSS + Radix primitives | Fast, consistent, themeable neon-noir skin |
| **Client state** | Zustand (game state) + TanStack Query (server sync) | Lightweight, tick-friendly |
| **Realtime** | WebSocket (Socket.IO or native WS) | Server pushes tick diffs, events, interdiction prompts |
| **Backend** | Node.js + **NestJS** (or Fastify if leaner) | TypeScript end-to-end; shares types/simulation code with client for prediction |
| **Game simulation** | Authoritative server tick engine (deterministic, seeded RNG per player) | Anti-cheat, replayable events |
| **Database** | **PostgreSQL** (player state, ledger, world config) + **Redis** (tick cache, sessions, timers) | Relational ledger is literally accounting; Redis holds hot convoy positions |
| **Auth** | Email/OAuth (JWT + refresh) | Standard |
| **Hosting** | Containerized (Docker) on any PaaS; static client on CDN | Browser game = cheap static + one API box to start |
| **Analytics** | Event pipeline (PostHog) | Balance tuning from real route/failure data |

*Alternative: Python/FastAPI backend works equally well; choose Node if you want one language and shared simulation code between server and client.*

## 7.2 System architecture

```
┌─────────────┐   HTTPS/WS   ┌──────────────┐   ┌──────────────┐
│  Browser     │◄───────────►│  API Gateway  │──►│  PostgreSQL  │
│  React+Pixi  │  tick diffs  │  (NestJS)     │   │  (ledger,    │
│  client      │  events      │               │   │   saves)     │
└─────────────┘              │  ┌─────────┐  │   └──────────────┘
                             │  │ TICK    │  │   ┌──────────────┐
                             │  │ ENGINE  │──┼──►│  Redis       │
                             │  │ (1s loop│  │   │  (hot state, │
                             │  │  =1 game│  │   │   timers)    │
                             │  │  minute)│  │   └──────────────┘
                             │  └─────────┘  │
                             └──────────────┘
```

- **Server-authoritative:** clients send *intents* (create shipment, pay bribe); the tick engine resolves outcomes. Client never rolls its own dice — prevents save-scumming and memory-hacking.
- **Tick engine:** 1 real second = 1 game-minute. Each tick: advance convoys, decay heat, process event timers, emit diffs only (bandwidth-light). Scales to thousands of players on one core since most ticks are no-ops.
- **Deterministic RNG:** per-player seeded PRNG; seed + action log = full replay (great for debugging balance and for "run replay" shareable feature).

## 7.3 Core data model (PostgreSQL, simplified)

```sql
players        (id, email, pass_hash, created_at, rng_seed, prestige)
player_state   (player_id, dirty_cash, clean_cash, raw_kg, refined_kg,
                global_attention, game_clock, speed_setting)
nodes          (id, name, type, region, base_bribe_cost, pos_x, pos_y)   -- static config
node_heat      (player_id, node_id, heat, last_activity_at)
edges          (id, from_node, to_node, mode, base_risk, base_hours, base_cost_per_kg)
shipments      (id, player_id, status, total_kg, route_json, started_at, resolved_at)
shipment_legs  (id, shipment_id, edge_id, vehicle, bribe_paid, risk_snapshot, outcome)
safe_houses    (id, player_id, node_id, capacity, conversion_ratio, stored_raw, stored_refined, burned)
contacts       (player_id, npc_key, reputation, tier, tribute_due_at, tribute_amount)
launder_jobs   (id, player_id, method, amount_in, fee_pct, completes_at, audit_flag)
events_log     (id, player_id, type, payload_json, created_at)  -- also feeds replay
missions       (id, player_id, npc_key, terms_json, deadline, status)
```

Static game data (nodes, edges, events deck, price indices, NPC config) lives in versioned JSON config (`/config/balance/v1.0.json`) — designers tune numbers without migrations; the server hot-reloads it.

## 7.4 Key backend services

| Service | Responsibility |
|---|---|
| `TickEngine` | game clock, convoy movement, heat decay, timers |
| `RiskResolver` | the §5.2 formula + interdiction outcome table |
| `EconomyService` | price index drift (sin + noise + event shocks), market sales |
| `HeatService` | per-node heat mutations and threshold effects |
| `LaunderService` | queued washing jobs, audit rolls |
| `ContactService` | reputation, tribute scheduler, mission generator |
| `EventDeckService` | weighted random events, NPC-scoped triggers |
| `SaveService` | snapshot player_state → Postgres each 30 ticks + on action |

## 7.5 Client architecture

- `GameSocket` → applies server diffs to Zustand stores (`useWorldStore`, `useLedgerStore`, `useContactsStore`).
- `MapLayer` (PixiJS): painted map texture, node sprites with heat-shader halos, route polylines, convoy sprites (pixel avatar), camera pan/zoom.
- `UI Layer` (React DOM above canvas): panels, modals, dialogue — DOM for crisp text and accessibility.
- `Prediction shim`: client runs the shared TS risk formula to preview survival % in the planner instantly (server still authoritative on resolution).

## 7.6 Non-functional notes

- **Save integrity:** every money mutation is a ledger row (append-only) — cheating support tickets become SQL queries.
- **Scaling path:** single server → shard by player (no player-vs-player in v1, so sharding is trivial).
- **Rate limiting:** intent endpoints throttled; tick stream is server-push only.
- **Live-ops friendly:** event deck and balance config hot-swappable for seasonal events ("Monsoon Season," "Schengen Crackdown Week").

---

# 8. THE FIRST FIVE MINUTES — TUTORIAL SCRIPT

*Format: [SCREEN], (UI action), DIALOGUE. Total runtime ≈ 5:00 at reading pace, all steps skippable after first completion.*

**[0:00] COLD OPEN — Cinematic card (throne key art, slow zoom)**
> *Text crawl, typewriter SFX:*
> "Every empire moves in a box. A container, a truck, a fishing boat. Somebody plans its route. Somebody prices its risk. Tonight, that somebody is you."

**[0:20] SCREEN: dark Bangkok street panel (comic art). A phone buzzes. UI: single pulsing [Answer] button. Nothing else is interactive — attention funnel.**

**KENJI (SMS):** "You landed? Good. Don't look at the temples. Look at the docks. — K"

**KENJI (SMS):** "Boss wants to meet you. Don't worry about the joke. There's always a joke. Laugh if it's funny. Laugh if it isn't."

**[0:45] Dialogue scene — YAYAYAhujUS, neon jungle office.**

**YAYAYAhujUS:** "A new logistics mind! Welcome. Tell me — why did the powder cross the border?"
**[Player choices:]** [ "…Why?" ] [ (Stare silently) ]
**YAYAYAhujUS:** "Because YOU will tell it to! HA! …You and I will make money together."
> *(Tutorial tooltip: "Dialogue choices affect Reputation. The Joker remembers who laughs.")*

**YAYAYAhujUS:** "Kenji will walk you through a small run. Baby steps. 10 kilos to Pattaya. Even a comedian could not lose this."

**[1:30] SCREEN: World map zooms to SE Asia. Only 3 nodes lit: VN–KH Border, Bangkok, Pattaya. Rest of map in ink-dark silhouette — the world "unlocks" as the campaign grows.**

**KENJI (voice of the tutorial, step tooltips):**
1. "This is the map. Everything happens here. See the green halo on Bangkok? That's **Heat** — how watched a place is. Green is cold. Red is closed."
2. "Tap the VN–KH border node. **Buy 10 kg raw.** That's your dirty little seed capital at work."
3. "Now open **New Shipment**. Drag a route: Border → Bangkok → Pattaya. See the planner's **Survival %**? 94%. That's the whole game in one number."
4. "Pick the motorbike courier. Small, fast, forgettable — like a good joke."

**[2:45] Convoy launches. Time runs at 4×. Pixel avatar crawls the route line.**

**KENJI:** "Watch the ledger on the right. That's your heartbeat now."

**[3:15] SCRIPTED EVENT (guaranteed, teaching moment):** popup — *"Police checkpoint outside Pattaya."*
**Choices:** [Pay $200 shakedown] / [Risk it (91%)]
> *(Tutorial: "Small bribes are the cost of silence. Risk it if you like odds. The Joker likes odds.")*
Scripted outcome: either way it resolves benignly (a win — new players must taste success).

**[4:00] Arrival. Sale auto-executes at Pattaya: +$90,000 Dirty Cash.**

**KENJI:** "See the $D? Dirty money. It smells. You can't buy a truck with it. Open **Launder**. Courier drop — 30% fee. Painful, yes. Clean is expensive. Dirty is fatal."

**(Player launders; $C 63,000 lands.)**

**[4:40] Wrap-up.**

**KENJI:** "Rules of the road. One: Heat fades if you let a place rest. Two: the Imperator's tribute comes every week — pay it. Three: Rotterdam is run by a Polish man with no sense of humor and a perfect record. You'll meet him."

**YAYAYAhujUS (SMS):** "Why did the new boss succeed in Bangkok? …I'll tell you when you're worth the punchline. Pattaya is yours. Boston is dreaming of you. 🃏"

**[5:00] Map pulls back: the full route ink-draws itself across the world to Boston, then fades to silhouette. Title card: "SHADOW ROUTES." Bottom dock unlocks. Free play begins.**

**Tutorial completion flags granted:** `node_bangkok_safehouse_unlocked`, `contact_kenji_introduced`, `first_launder_done` → triggers Mission 1 from Mariusz ("Prove you can reach Białystok") 24 game-hours later.

---

# 9. MVP SCOPE & ROADMAP

| Phase | Scope |
|---|---|
| **MVP (12–14 wks)** | Solo campaign, primary route only, 3 NPCs with fixed dialogue, tick engine + WS sync, map + planner + ledger UI, heat/risk/launder core loops, 15 events |
| **v1.1** | Secondary branches (Pattaya/Turkey/Rio), container minigame, Pixel Mode, full event deck |
| **v1.2** | Endgame arcs (Joint Task Force, Kingpin path), prestige/rebirth loop |
| **v2.0 (exploration)** | Asynchronous indirect PvP (sabotage contracts on a shared world map — prices only, no direct attacks) |

---

*End of document — Shadow Routes: The Green Powder Trail, GDD & Technical Architecture v1.0. All content fictional; mechanics abstracted; nothing herein describes real-world activity.*
