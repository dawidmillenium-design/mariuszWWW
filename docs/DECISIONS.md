# Architecture Decision Records

## ADR-001 — Engine: Vite 5 + TypeScript + raw WebGL2 (not Phaser)
**Status:** Accepted. Phaser's pipeline fights pixel-perfect rendering and bloats the bundle; raw WebGL2 sprite batch + GLSL lighting gives us HD-2D normal-mapped lights with full control. React retained for HUD/menus only.

## ADR-002 — Combat: deterministic pure functions, RNG injected
**Status:** Accepted. Combat core (`src/engine/combat.ts`) has zero I/O; seeded RNG in tests guarantees reproducible CI runs and enables the Investigator campaign's "rewind the evidence chain" undo mechanic via `gameStore.undo()`.

## ADR-003 — Canon: scenario/*.md is the single source of truth
**Status:** Accepted. Game data is ported from the scenario docs; deviations are logged here.

## ADR-004 — Saves: localStorage key `shadow-routes-save`
**Status:** Proposed. May migrate to IndexedDB for Episode Six cross-campaign persistence (Operator/Investigator shared world).

## ADR-005 — World layer: data-driven graph + Director orchestration
**Status:** Accepted. `world.ts` holds the 18-node 2026 grid and event pool as pure data (event effects return store Actions — no side effects, fully testable). `director.ts` is the only turn orchestrator; all state mutation flows through granular store actions (ADR-006), never written directly.

## ADR-006 — Granular reducer actions over compound ones
**Status:** Accepted (replaces Phase 2 compound EXTRACT/TRANSIT/LAUNDER/DIG actions). Compound actions hid heat/case interactions and caused double-counting in review; granular POWDER/CLEAN/HEAT/DRILL/CASE_UP/MOVE_TICK/COOLDOWN make every economy effect explicit, order-controlled, and independently testable.

## ADR-009 — Battles replace raids, never stack
**Status:** Accepted. One encounter per turn: the raid roll fires first; if it does not, the ambush roll (heat > 20, p = heat/100 × 0.3) may. Keeps pacing predictable and modals sequential.

## ADR-010 — Dual campaign: one world state, inverted goal
**Status:** Accepted. The Investigator reuses GameState (kas = their win meter, drill = their lose meter) with a warrant resource. Endings map: 'case-closed' / 'concrete-dawn'. Combat squads do not persist across encounters by design (arcade pacing, v1.2 may add persistent crew).

## ADR-011 — Photographic strategy map as canonical board
**Status:** Accepted. `assets/map-strategy.png` (1792x1024) is the main strategy map; all 18 node
coordinates remapped to its geography (Asia right/green, Europe top-center/blue, Americas left/purple,
Africa center/magenta). Procedural continent render retained as fallback when the asset is missing.
Node coordinates are display-only — game logic uses ids/graph, so remaps never touch balance.
HUD gains the mockup's SYNDICATE BOSSES rail and segmented meters (cosmetic); mechanics stay canon
(4 faction gauges, not the mockup's placeholder meters).

## ADR-012 — Photo assets: cinematic select + field-event imagery
**Status:** Accepted. `select-screen.png` replaces the drawn select cards (click zones: left=Ping,
center=BlackHUJUS, right=MERhujUS — matching the photo's panel order). `event-vlogger.png` powers the
"Mr Bannny" field event (Episode Three's tourist), the first event with imagery. Assets live in
public/assets (Vite-copied, LFS-tracked); a missing asset always falls back gracefully.
