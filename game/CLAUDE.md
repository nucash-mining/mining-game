# Instructions for Claude Code — remaining Mining Game asset work

You are working on the 3D game in `game/` (single-file build, see `game/README.md`).
The tasks below need Blender (or another DCC tool) and could not be done in the
browser-agent environment that built the game. Work through them in order.
After any code change: run `game/build.sh`, open `game/mining-game.html` in a browser,
and verify with the debug handle `window.MG` (see "Testing" below).

## Context: current scale system

- World scale: **2.25 units per meter** everywhere.
- Desks are currently **procedural** (no GLB): built in `game/parts/p07_models.html`
  (`makeDesk`, constants `const DESK={W:4.3, D:2.2, TOP:1.60, SURF:1.68, SHELF:3.05}`
  = 1.9 m wide, 0.98 m deep, 75 cm surface, monitor shelf 61 cm above the surface).
- The Free Mint PC case GLB is normalized to height 1.03 (46 cm ATX mid-tower) in
  `game/parts/p08_rigs.html` and sits on `DESK.SURF`.
- Monitors are procedural planes with selectable sizes (24/27/32/38/49", table
  `MONSIZES` in `game/parts/p04_data.html`, selector in the GARAGE menu).
- Chairs are procedural (`makeChair(gaming)` in p07): a basic desk chair on every desk,
  upgradable in GARAGE to a gaming chair (+3% luck).

## Task 1 — proper desk model in Blender (replaces procedural desk)

The original desk proportions were wrong (desk too small / too low, PC case
intersected the monitor shelf). The code-side fix shipped, but the desk should be a
real asset:

1. Model a battlestation desk at **real scale**: 1.9 m wide x 0.9-1.0 m deep,
   75 cm surface height, with a monitor shelf/riser whose underside is **at least
   60 cm above the desktop** so the 46 cm Free Mint case fits under it with clearance.
   Style: dark cyberpunk, low-poly friendly (the game targets integrated GPUs).
2. Check ratios against `Free Mint PC case.glb` **inside Blender** (import both,
   case must read as a mid-tower next to the desk, not a mini-ITX or a fridge).
3. Export `desk.glb` (glTF, meshopt-compressed via `gltfpack -i desk.gltf -o desk.glb -cc`),
   **under 2 MB**.
4. Wire it in: load in `loadModels()` (p07) as `PROTO.desk`, replace the procedural
   geometry in `makeDesk()` with `normalizeW(instOf('desk'), 4.3)` placed so the
   desktop surface lands exactly at `DESK.SURF` — every object in p08 positions
   itself relative to `DESK.SURF`/`DESK.SHELF`, so keep those constants accurate.

## Task 2 — monitor models with real size variants

In-game monitors are procedural planes sized from `MONSIZES` (diagonal-true ratios,
16:9 for 24/27/32", 21:9 for 38", 32:9 for 49"). Either:

- (a) model one parametric monitor in Blender and export per-size GLBs
  (`monitor27.glb`, ... each < 2 MB, meshopt), or
- (b) model a single bezel+stand GLB that the game scales non-uniformly to the
  `MONSIZES` w/h and texture-maps the live terminal canvas (`termTex`) onto the
  screen plane (see the `scr` mesh in p08 `buildRigVis`).

Repo already has `monitor.glb` — check its proportions in Blender first; it may only
need a rescale + screen-plane naming (name the screen mesh `SCREEN` so the code can
swap its material for `termTex`).

## Task 3 — chair models (none exist in the collection graphics yet)

Replace the procedural chairs with proper assets:

1. `chair_desk.glb` — plain office chair.
2. `chair_gaming.glb` — racing-style gaming chair (the in-game upgrade, red/RGB trim).
3. Real scale: seat 45 cm, gaming backrest ~80 cm above seat. Verify next to the desk
   and case in Blender.
4. Wire in: `makeChair(gaming)` in p07 — swap the procedural group for
   `normalize(instOf(gaming?'chairG':'chairD'), 2.35)` (chair total height ~1.05 m),
   keep the position/rotation lines (tucked at the keyboard side, facing the desk),
   and keep `rebuildChairs()` working (it swaps chairs on upgrade).

## Task 4 — fix source .blend ratios

`CpuCaseProject.blend` / `CpuCaseProject Built.blend`: normalize object scales
(Ctrl+A apply scale) and make sure the case, board, GPUs, monitor, keyboard and mouse
are mutually consistent at real-world sizes (ATX board 305x244 mm, GPU ~300 mm,
case 46 cm, 27" monitor 60x34 cm). The game currently compensates with per-item
`normalize*()` calls — after the .blends are fixed, those factors should barely change
when re-exporting.

## Publishing

The game is hosted on Browser Use's game hosting (only the original agent session can
push there). For any other host: it is one HTML file + the GLB/PNG assets at the web
root (`/pc.glb`, `/gen2.glb`, ... — see `loadModels()` in p07 for the full list).
GitHub Pages works: put `mining-game.html` as `index.html` and the assets beside it.

## Testing

- `game/build.sh` must print `BUILD OK`.
- In the browser console: `window.MG` exposes the game (`MG.S` state, `MG.give(watt)`,
  `MG.tick(seconds)`, `MG.mintPC()`, `MG.buyItem(id)`, `MG.openBench(0)`,
  `MG.openOS(0)`, `MG.openPoolHub()`, `window.__errs` collects runtime errors).
- Visual checks after asset swaps: case under shelf with clearance, monitor sizes
  switch in GARAGE, chairs upgrade when buying the gaming chair, workbench drag-drop
  still snaps (p08b uses its own scene + `pcboard.glb`).
- Old saves must keep working: `load()` in p04 migrates — never rename existing state
  fields, only add with defaults.
