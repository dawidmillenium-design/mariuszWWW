# SHADOW ROUTES — GDD (v0.2, Phase 2)
Genre: HD-2D pixel CRPG. Combat: grid tactics, 3-5 AP per turn, abilities cost AP, movement 1 AP/tile (2 for BLACKHUJUS).
World: 18-node ops grid (see game HTML v2.0). Dual clocks: DRILL (win) vs CASE (lose). 4 faction gauges.
Heroes: YAYAYAhujUS (Asia/CHA), MERhujUS (Europe/LOG), BLACKHUJUS (Americas+Africa/STR).
Canon: scenario/*.md. Save: localStorage `shadow-routes-save`, undo via store history.

## Phase 3 additions (v0.3)
Core loop lives in `Director`: travel(gated by adjacency) → node action (extract/transit/launder/dig) → heat/case tick → field event (30%, dig 35%) → raid check (p = heat/100 × 0.55) → ending check. Hero economy passives: ping +12 extract & ×1.4 launder cooling; mariusz ×1.5 transit & -1 travel heat; black ×1.5 extract & ×1.25 launder. Raid: loss = 25% powder + case, or 60-powder bribe. Endings: CONCRETE DAWN (drill 100), BERTH 44 (case 100).

## Phase 6 additions (v1.1)
COMBAT: ambush chance p = heat/100 × 0.3 (heat > 20), battles replace raids that turn. Squads: operator + 2 crew vs 2–4 TF agents (count & hp scale with heat). Auto-battle AI: aggressive closes and swings, defensive holds cover. Outcomes: win (heat -10, +15 salvage), draw/escape (heat -4), loss (25% powder seized, case +8).
INVESTIGATOR (press I at title): warrant-limited investigations; node actions: surveillance/extract, tail+seizure/transit, audit/launder, seismic sweep (drill -2)/dig. Operator clock: drill +2 per 3 moves. Endings: CASE CLOSED (kas 100) vs CONCRETE DAWN (drill 100).

## v1.2 — Strategy map
Main board is the photographic ops map (assets/map-strategy.png) with remapped node coordinates; boss rail + command bar HUD; canvas-bounds regression test.

## v1.3 — Cinematic select + vlogger event
Select screen uses the three-leader photo with clickable panels; "Mr Bannny — STATUS: UNDETECTED" field event with image.
