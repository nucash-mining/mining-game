# Instructions for Claude Code — remaining Mining Game asset work

You are working on the 3D game in `game/` (single-file build, see `game/README.md`).
After any code change: run `game/build.sh`, open `game/mining-game.html` in a browser,
and verify with the debug handle `window.MG` (see "Testing" below).

> **Status update (Browser Use agent):** Tasks 1–4 are DONE — the assets were built
> programmatically with `game/tools/asset-factory.html` (three.js + GLTFExporter in the
> browser, no Blender needed) and are wired into the game with procedural fallbacks.
> Remaining: Task 5 (optional sit-pose avatar) and Task 6 (source .blend cleanup),
> both of which still need a DCC tool.

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

## Task 1 — proper desk model — ✅ DONE (desk.glb, `makeDesk` in p07)

Authored in `tools/asset-factory.html` at real scale (1.911×0.978 m, surface 0.7467 m,
shelf center 1.3556 m — exactly `DESK.*`/2.25). Loaded as `PROTO.desk`, placed with
`scale.setScalar(2.25)`. The procedural desk remains as a fallback if the GLB 404s.
Legacy notes for a Blender re-do (optional polish):

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

## Task 2 — monitor models with real size variants — ✅ DONE (monitor.glb)

One parametric bezel+stand GLB with the screen mesh named `SCREEN`. `buildRigVis` (p08)
swaps its material for the live `termTex` canvas and non-uniformly scales the 27" base
to the `MONSIZES` entry (`mm.scale.set(2.25*mw/1.34, 2.25*mh/0.76, 2.25)`).
Procedural fallback kept. Legacy Blender notes (option (b) is what shipped):

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

## Task 3 — chair models — ✅ DONE (chair_desk.glb, chair_gaming.glb)

Real-scale chairs (seat 45 cm, gaming back 1.05 m total) with merged geometry
(~900 tris each). `makeChair(gaming)` in p07 clones `PROTO.chairD/chairG` at 2.25×;
`rebuildChairs()` still swaps on upgrade (group keeps `name='chairG'`).
Procedural fallback kept. Legacy Blender notes:

Replace the procedural chairs with proper assets:

1. `chair_desk.glb` — plain office chair.
2. `chair_gaming.glb` — racing-style gaming chair (the in-game upgrade, red/RGB trim).
3. Real scale: seat 45 cm, gaming backrest ~80 cm above seat. Verify next to the desk
   and case in Blender.
4. Wire in: `makeChair(gaming)` in p07 — swap the procedural group for
   `normalize(instOf(gaming?'chairG':'chairD'), 2.35)` (chair total height ~1.05 m),
   keep the position/rotation lines (tucked at the keyboard side, facing the desk),
   and keep `rebuildChairs()` working (it swaps chairs on upgrade).

## Task 4 — farm structure models — ✅ DONE (container.glb, warehouse.glb, server_rack.glb)

- `container.glb` — real 20ft HC (6.06×2.44×2.90 m), corrugated walls, open end at
  local −Z with ~100° open doors, hazard band, NUCASH MINING decals, serial tag.
  `makeContainer` places it at `position.z=15`, scale 2.25.
- `warehouse.glb` — 11.556×4.444×3.333 m steel shell + gable roof, open front −Z,
  baked '⛏ ELITE MINING FARM' sign. `makeWarehouse` places at `position.z=27`.
- `server_rack.glb` — 4-post open rack, shelf meshes named `SHELF_0/1/2`; `makeRack`
  slides them to the SLOTS heights (container 2-shelf racks hide `SHELF_2`).
- All keep procedural fallbacks; interior lights/racks stay in code.
Legacy Blender notes:

The game now has a farm progression: garage -> shipping containers (PRO status,
6 rack slots each) -> warehouse (ELITE status, 12 rack slots). All are procedural
(`makeContainer`/`makeWarehouse`/`makeRack` in p07). Better assets:

1. `container.glb` — 20ft high-cube shipping container, one long side/end open,
   real scale 6.0 x 2.4 x 2.9 m, weathered cyberpunk paint, < 2 MB.
2. `warehouse.glb` — open-front steel warehouse shell, ~11.5 x 4.5 x 3.3 m footprint
   in world units 26 x 10 x 7.5 (2.25 u/m).
3. `server_rack.glb` — 2-post/4-post open rack with 2-3 shelves; the game places PC
   cases on shelf heights listed in `SLOTS` (index 9+ entries are [x,z,shelfY]).
4. Wire-in points: `makeContainer`, `makeWarehouse`, `makeRack` in p07 — keep the
   rack shelf Y coordinates aligned with the `SLOTS` table in p04 or move both together.

## Task 5 — chair sit-pose player avatar (optional polish)

Chairs are clickable/tappable (sit function: first-person at the desk, `sitDown()` in
p11). An optional seated character or VR-style hands would sell it.

## Task 6 — fix source .blend ratios

`CpuCaseProject.blend` / `CpuCaseProject Built.blend`: normalize object scales
(Ctrl+A apply scale) and make sure the case, board, GPUs, monitor, keyboard and mouse
are mutually consistent at real-world sizes (ATX board 305x244 mm, GPU ~300 mm,
case 46 cm, 27" monitor 60x34 cm). The game currently compensates with per-item
`normalize*()` calls — after the .blends are fixed, those factors should barely change
when re-exporting.

## Component orientation — the POSE table + POSE LAB (added 2026-09-09)

Every hardware GLB carries its own authored orientation, and each mount used to
compensate on its own: the workbench had a per-item `flip` flag plus a long-axis
guess, the open-air frame had a private `RACK_POSE` table, the server tower had
nothing. They disagreed, so a card sat one way on the rack and another way in
the case — and because the bench assumed cards arrive lying down, GPUs installed
in a Gaming PC were laid FLAT on the motherboard instead of standing in a slot.

One table owns it now: `PART_POSE` in `parts/p04_data.html`.

- Lookup, later wins: `POSE_DEF` → `'*:key'` → `'ctx:*'` → `'ctx:key'` → the
  player's calibration in `S.pose` (same key shapes). `'*:key'` is the model's
  own authoring fix and is normally the one to edit.
- A pose is applied to the RAW model **before** it is fitted and grounded, so
  editing one never moves the mount point. `rx/ry/rz` are degrees, `x/y/z` are a
  post-fit nudge, `s` multiplies the fitted size.
- Build every mounted part with `poseMesh(ctx, itemKey, fit)` (p04). It returns
  a group whose origin IS the mount point — the part is centred in x/z with its
  lowest point at y=0 — so mount code only positions the group.
- **Canonical stance for a GPU: standing on its connector edge, long axis x,
  thin axis z (fans facing ±z).** Verified against the models with
  `MGPOSE.dims(key)`: gen1 tx120/gp50 and gen2 gpx880 are authored standing,
  tx190/gp720 lying flat (hence their `rx:-90`). Seating a card is therefore
  pure placement — `seatCard` (p08b) does NOT rotate.
- Contexts: `rack` (open-air frame rail), `pcie` (PC board slot), `tower`
  (dual-CPU server board), `towerbay` (inside the Server Tower in the world),
  `socket` (CPU socket), `pad` (floor/shelf), plus `thumb` for the shop
  thumbnails, which just inherits `'*:key'`.
- Shared mount code, used by the game AND the lab so they can't drift:
  `placeRackGpus` (p08), `seatCard` (p08b), `placeTowerBayGpus` (p07).

## The Server Tower shows its build (added 2026-09-09)

The tower is a real rig (2 CPUs + 6 GPUs on its dual-CPU board) but the case
only ever glowed. `syncTowerBuild()` in `parts/p07_models.html` now renders what
is installed, and `syncTowerGlow()` calls it — so every existing install/remove
path in p08b picks it up with no extra wiring. `setTowerOwned()` also resyncs
when the tower is re-shown, so a DEMO↔LIVE switch or a save reset cannot leave a
stale build inside it.

- **No side panel to remove.** The gen2 bundle merges the whole chassis into ONE
  mesh (`MGPOSE.dims('tower')`, and the runtime model has a single material), so
  a populated tower switches its shell to smoked glass (`TOWER_BAY.glass`,
  `depthWrite:false`, shell `renderOrder=1`) and lights the interior instead. An
  empty tower stays an opaque, closed case. The shell material is **cloned** in
  `towerMeasure()` — fading the shared PROTO material would fade the thumbnails.
- **Everything is measured, nothing hardcoded.** `towerMeasure()` records the
  case's own local bounds at build time (towerVis is still untransformed there,
  so the box is tower-local; it comes out 2.2 × 1.8 × 0.83). `towerBayOf(box)`
  derives the usable bay from that, so a re-exported or replaced tower model
  still lays out correctly.
- **The cards are in PCIe slots, laid out the way a real tower is.** The case
  measures 2.2 × 1.8 × 0.83, so the big face the player looks at IS the side
  panel and its intake fan sits on the −x face: −x is the front, +x the rear.
  The motherboard therefore stands on the far inner wall (`bay.tray`) with its
  plane parallel to the glass, slots running along the case (x) and stacking up
  it (y).
  - **PCIe pitch is the card's THICKNESS, not its height.** A dual-slot card is
    ~40 mm thick and ~120 mm tall; that is why six of them fit in a case at all.
    Getting this backwards is what produced the first (wrong) version — a
    floating 2 × 3 grid of cards bolted to nothing.
  - A card in a slot: length along the slot (x), thickness the stacking axis
    (y), body standing off the board toward the glass (z), fans facing down —
    which is exactly what the canonical POSE stance gives after one +90° roll
    about x, with the group origin (the connector edge) parked on the board
    face. `TOWER_BAY.slotGap` is the pitch as a multiple of card thickness.
  - **Depth is the binding constraint, and `towerFitOf()` solves for it.** A
    card has to fit between the tray and the glass, and the board's own
    heatsinks eat that depth first — so the budget counts board thickness plus
    card standoff together, per unit of card length, from probe measurements
    (no guessed ratios). Skipping the board term is what left cards poking
    through the side panel. Cards shrink further only if there are more of them
    than the board is tall.
  - CPU coolers (`placeTowerCpus`) mount up the board clear of the slot stack
    and get **no roll at all**: the CPU models are authored fan-up, which is why
    the workbench — whose board lies flat — has always shown them right, so
    identity is already the pose that points the fan at the ceiling. Rolling
    them with the cards laid them on their side. They sit proud of the board
    face rather than straddling it. The board stands off the case floor by 16%
    of the interior height — PSU space, as in a real tower.
- Card orientation comes from the `towerbay` POSE context, so it is calibratable
  in the POSE LAB like every other mount — the lab previews the real case's
  bounds when the player owns a tower, board and all.
- Shared layout: `towerBayOf` → `towerFitOf` → `placeTowerBoard` →
  `placeTowerBayGpus` / `placeTowerCpus`, called in that order by both
  `syncTowerBuild` and the lab.
- Debug: `MG.syncTowerBuild()`, `MG.openTowerBench()`.

**POSE LAB** (`parts/p11b_pose.html`, hotkey `P`, or GARAGE → Pose Lab) is the
editor: mount + component pickers, rotate/nudge/scale controls, keyboard
(arrows rotate X/Y, Q/E roll, WASD/R/F nudge, shift = finer), and a gold arrow
marking +Z — the side the player stands on, i.e. where the fans belong. Edits
write `S.pose`, apply to the farm and an open workbench after a short debounce,
and **EXPORT TABLE** copies a paste-ready `PART_POSE` for p04_data.

Debug handle: `window.MGPOSE` — `open()`, `stage()`, `render()`, `bump(field,dir)`,
`table()`, `dims(key)` (a model's raw authored bounds), `posed(ctx,key,fit)`.

**Testing:** `node tools/posetest.mjs` → `POSE TESTS OK`. It pulls the pose
helpers verbatim out of the BUILT html and checks them against real three.js
(grounding, rotate-before-fit, lookup order, offsets/scale, `poseSet` storing
only what differs, slot seating, rack rails/risers, table well-formedness).
Run it after any change to the table or the mount code.

## Spinning fans (added 2026-09-10)

Fans turn clockwise while a rig is actually mining and stop dead otherwise
(`spinFans` in p07, driven from `frame()` in p11 — per rig via
`rigVis[i].modelFans`, and for the tower via `towerVis.userData.fans`). The gate
is `!noWatt && rigHash(r) > 0`, so off, crashed, worn out, or out of WATT all
read as still.

**Getting a fan that can spin at all was the hard part.** The gen2 bundle is
optimized: each model arrives as ONE merged mesh with one atlas material
(`PaletteMaterial001`), so there is no fan node to grab and no material name to
match — and rotating the merged mesh would swing the fans around the card
instead of spinning them. `splitFans` (p07) therefore works on geometry:

- Find the mesh's connected components (union-find over welded vertices).
- Keep the ones shaped like a fan — `fanTest`: flat, round (a disc's bounding
  box is square), dense enough, and neither a screw nor the whole part.
- `bladeRings` also groups identical repeated components into a ring, because
  some cards model every blade separately. A heatsink's fins are identical and
  repeated too, but they sit in a LINE, so the roundness test drops them.
- Concentric candidates keep only the densest: an XXL270's blades sit inside a
  shroud ring of the same width and centre, and the shroud must not spin.
- Candidates that disagree on axis lose to the majority — every fan on one part
  faces the same way, and spinning a non-fan reads worse than spinning nothing.
- Each survivor is lifted into its own mesh **pivoted on its hub**, its
  triangles removed from the host mesh, and tagged `userData.fanAxis`. Verified
  in-browser: the hub does not move and a blade vertex traces a true arc
  (chord = r·√2 at 90°).
- Only GPU/Processor/ASIC models are scanned — a chassis panel is also flat and
  square, and must never spin.

**Known gap:** two models yield no fans — the TX190, whose blower cage is
chunkier than the flatness test allows, and the Bit Hammer ASIC. Everything else
spins (TX120 2, GP50 2, GP720 4, GPX880 4, XL190/XXL270 1 each). If those two
matter, the fix is a small per-model fan table (hub, radius, axis in canonical
space) that `splitFans` consults instead of classifying — the same shape as
`PART_POSE`, and calibratable the same way.

Debug: `MG.spinFans(fans, dt, mining)`, `MG.collectFans(obj)`. Note that a
BACKGROUNDED tab runs no `requestAnimationFrame`, so nothing animates and
screenshots look frozen — drive `MG.spinFans` by hand when testing that way.

## Bench CPU coolers were leaning with the GPUs (fixed 2026-09-12)

The bench's board (`bBoardG`) is tilted toward the camera for the 3/4 view
(`BOARD_TILT`, ~56°), and everything mounted on it is a CHILD of that tilted
group. GPUs get their own `seatCard` rotation (stand the card up in its slot)
which is independent of the tilt — fine either way. CPU coolers got NO
rotation at all, on the assumption identity is already fan-up (true — it's
how the tower's in-world build mounts them, with no tilted parent). On the
bench, "no rotation" meant the cooler's local up tilted right along with the
board, so it ended up leaning the same way as the GPUs instead of pointing at
the ceiling.

Fix: `seatCpu` (p08b_bench, next to `seatCard`) applies `rotation.x=-BOARD_TILT`
to cancel the parent's tilt for that one child — same trick as `seatCard`,
just countering instead of adding. Used by both CPU mount sites (the tower's
dual-socket board and a Gaming PC's single socket — same bug, same fix, one
function). GPU orientation was untouched by design (was already correct).

Regression: posetest.mjs mounts a synthetic cooler under a mock tilted board
group and asserts its WORLD "up" vector still points to world-up regardless
of the parent's tilt — that's the actual bug, not just "rotation.x equals
some number."

## Server Tower reached full mining parity with a Gaming PC (added 2026-09-12)

The tower had real hardware, real hashrate on the HUD, and a build you could
see through the glass — but no way to actually control it. Clicking it went
straight to the workbench, skipping the step a Gaming PC gets first (see its
stats, power it down, pick a network, log into an OS); worse, **its hash never
actually entered the DEMO mining loop**, so it drew power and displayed a
hashrate without ever finding a block. Fixed end to end:

- **`freshTowerRig()`** (p04_data) is now the one place `S.towerRig` gets
  created (was inlined in 4 places) — `{cpus,gpus,on,net,oc,crashT,wear}`,
  the same mining-control fields a desk rig carries (`net`/`oc`/`crashT`/`wear`
  are new). Old saves migrate in `load()`.
- **`towerHash`/`towerWatt`** now apply the same overclock multiplier and
  wear/crash derate as `rigHash`/`rigWatt` (`ocHashMult`/`ocWattMult`/
  `ocRiskPerMin` were already generic — they read `.oc` off whatever's passed
  in, so this was just wiring, no new formulas). New `towerValue()` for
  `repairCost`.
- **The DEMO mining loop (`simTick`) now actually includes the tower.** It was
  gated on `S.rigs.length` — a tower-only player mined nothing at all — and
  even with a Gaming PC present the tower's hash was never added to `byNet`.
  Fixed on both counts; the tower joins under the sentinel `'tower'` (not a
  `S.rigs` index) in `byNet[nk].rigs`, and the block-found particle burst
  resolves position from `towerVis.position` when it wins instead of
  `SLOTS[r.slot]`.
- **`towerSimStep(dt)`** (p09_sim) is the tower's own crash/wear tick, same
  rules as a desk rig's, addressed differently (no `SLOTS[r.slot]`/`rigVis[ri]`
  — burst position comes from `towerVis`, and the "which OS is open" check is
  `OS.tower` instead of `OS.rig===ri`).
- **`togglePower`/`repairRig`/`setOC`/`setRigNet`/`rebootRig`** all take the
  sentinel `'tower'` alongside a `S.rigs` index now — one code path, not a
  forked one. `totSWStake()` derates the tower's stake weight while powered on
  exactly like a rig (25%), which only matters now that toggling it is real.
- **A real tower panel** (`renderTowerPanel`, p10_ui) — same shell as
  `renderRigPanel` (stats, wear bar + repair, power toggle, MOVE, SHOP, CLOSE)
  minus the slot rows, which the workbench already owns and isn't worth
  duplicating. `selTower` (alongside `selRig`) gates it; `renderRigPanel()`
  checks it first and delegates. Clicking the tower now opens THIS, matching a
  Gaming PC's first stop — `OPEN CASE — INSTALL PARTS` is one button away, not
  automatic. Every place that used to reset `selRig=-1` (Escape, move-start,
  mode switch, the OS's own hide-the-panel-behind-it step, …) now clears
  `selTower` too, or the tower panel would keep reappearing underneath.
- **The OS itself is shared, not duplicated.** `OS.tower` (alongside `OS.rig`)
  plus two helpers — `osTarget()` (`OS.tower?S.towerRig:S.rigs[OS.rig]`) and
  `osLabel()` (`'Server Tower'` or `'Rig N'`) — are the only new primitives;
  every app (`osBoot`, `osLogin`, `osDesktop`, `osAppMiner`, `osAppTunex`)
  reads through them instead of indexing `S.rigs[OS.rig]` directly. SwapinDEX/
  Wallet/Browser needed no changes — they were already rig-agnostic. The boot
  sequence lists each installed CPU individually for the tower (`cpus` is an
  array) vs. the rig's single `CPU : name` line. `openOS('tower')` is a no-op
  if the player doesn't own a tower (mirrors the panel button only existing
  when they do).
- The `O` hotkey opens the tower's OS when the tower panel is the one open
  (`selTower`), same as it opens a rig's when a rig is selected.

Verified live (Chrome): tower panel opens with real stats, POWER OFF drops the
glow to baseline and stops the block-found loop, POWER ON resumes it, TuneX
applies +15%/+21% hash/watt at +3 core clock and shows real crash-risk %,
network switch persists to `S.towerRig.net`, the OS boot sequence lists both
installed CPUs by name, and a tower-only save (`S.rigs=[]`) mines without
error. No regression on a normal rig's panel/OS (spot-checked after every
shared-function change).

## THA payout target (added 2026-09-12)

THA joins ALT/WTX/POL/BSV/HTH/BITN as PayoutHub target **id 6** — a pure-PoS
staking coin (THAtoshi, Bitcoin Core 26 fork; `nLastPOWBlock=36`, so it has
mined nothing since block 37 — rewards come from `generate`-category
coinstakes on the node's SEND wallet, RPC `127.0.0.1:7221`).

- Registered on-chain via `mining-game-pool-operator/scripts/register-tha-target.mjs`
  (same idempotent pattern as `register-bitn-target.mjs`): **confirmed on
  Polygon** (tx `0xba9911f0…`). **Altcoinchain is broadcast but unconfirmed** —
  `rpc.wattxchange.app`'s tip was stuck at block 7,265,745 for 15+ minutes
  during this session (a chain-liveness issue, not a registration problem); the
  tx is correctly nonce-ordered and will land once that chain resumes. Re-run
  `node scripts/register-tha-target.mjs alt` to confirm/retry once it's back.
- Client-side: `WEB3CFG.targets` (p09b_web3), the 💳 PAYOUT ADDRESSES row + `ocSaveTha`
  (p09c_pools), and the THA branch of `ocFillPayoutBalances` (reads
  `tha-api.wattxchange.app/api/address/<addr>`, same shape as the BITN explorer).
- **The off-chain operator feeder is wired and self-arming.** What's missing
  is a **pool that offers THA** — `addPoolTarget`/`createPool` on the engine
  are gated to the POOL OWNER's own wallet
  (`0x8324FA247756a9D2Be9D16884f620e65a142E514`, the wallet that already hosts
  Genesis Pool WTX/ALT/HTH/BITN — confirmed a plain EOA, not a Safe), not the
  deployer/hub-owner key this session used for target registration — hosting a
  pool is a browser-wallet action by design, so there is no server-side key
  for it and none was sought.
  **The one remaining step is a single click:** open 🏊 POOL HUB in-game
  connected as that wallet — the create-pool form now stays visible even when
  already registered (`ocHostPool`'s registration check already skipped the
  100k re-lock for a registered host; the UI just used to hide the form). Tick
  THA, submit — no new WATT lock, gas only (`poolCount()` was 4 at last check,
  so the new pool lands as id 4).
  Everything after that is automatic: `mining-game-pool-operator/scripts/watch-tha-pool.mjs`
  runs under pm2 (`mg-tha-pool-watch`) polling both chains every 60s for a pool
  whose `poolTargets()` includes THA; the moment it sees one it sets
  `stakers.tha.reportTo`/`poolId`/`enabled:true`, arms `payers.THA.dryRun:false`,
  restarts `mg-pool-operator`, and exits. Check `pm2 logs mg-tha-pool-watch` to
  see whether it has already fired.
- Gas note: the Polygon pool-operator wallet (`0xd7eC194F…`) was critically low
  (0.0039 POL) and its self-healing `mg-gas-keeper` was stuck because its own
  DVN bootstrap source was also below its 0.3 POL threshold — a pre-existing,
  systemic issue affecting every Polygon-side pool operation, not THA-specific.
  Topped up 0.16 POL total from the DVN key to get the registration through;
  DVN is now itself thin (~0.19 POL). Recommend a real top-up of both wallets
  when convenient.
- Note there's an older, unrelated watcher (`scripts/pool0-watch.sh`,
  pm2 `mg-pool0-watch`) built for the FIRST pool ever appearing (routes
  HTH/BITN/WTX feeders at pool #0) — it's been silently looping on "none"
  since 2026-08-26 because its hardcoded `polygon.drpc.org` RPC stopped
  resolving, even though pools have existed for a while. Not touched this
  session (out of scope), but worth fixing or retiring — it's dead weight.

## Publishing

The game is hosted on Browser Use's game hosting (only the original agent session can
push there). For any other host: it is one HTML file + the GLB/PNG assets at the web
root (`/pc.glb`, `/gen2.glb`, ... — see `loadModels()` in p07 for the full list).
GitHub Pages works: put `mining-game.html` as `index.html` and the assets beside it.

## Movement / input (added 2026-07-28)

`parts/p11_loop.html` has a walk controller: WASD, W/A/D/**X**, and arrow keys move the
camera across the XZ plane, shift runs. It moves `cam.position` AND `controls.target` by
the same delta, so OrbitControls keeps owning look/zoom and the framing never twists.
Called as `tickWalk(dt)` from `frame()` in the non-seated branch.

**If you change movement, re-run the harness** — `walktest.mjs` extracts the WALK block
verbatim from the BUILT html and exercises it against real three + OrbitControls in node
(20 assertions: direction, no y-drift, framing preservation, wall stops, blocked states,
stuck-key release, zoom invariance). The DOM stub needs a `getRootNode()` or OrbitControls
throws.

Two traps already paid for:
- **Menu hotkeys are on the number row** (1-5) because `w`/`s` used to open the wallet and
  shop. Do not move them back onto letters that walk.
- **Clamping must be one-directional.** The default camera starts at z=8.6; a naive
  `ROOM.D/2-0.8` clamp snapped it across the room on the first keypress. `walkClamp()`
  never pushes a camera that is already outside the box further out, only inward.

## Testing

- `game/build.sh` must print `BUILD OK`.
- `node game/tools/posetest.mjs` must print `POSE TESTS OK` (component orientation).
- In the browser console: `window.MG` exposes the game (`MG.S` state, `MG.give(watt)`,
  `MG.tick(seconds)`, `MG.mintPC()`, `MG.buyItem(id)`, `MG.openBench(0)`,
  `MG.openOS(0)`, `MG.openPoolHub()`, `window.__errs` collects runtime errors).
- Visual checks after asset swaps: case under shelf with clearance, monitor sizes
  switch in GARAGE, chairs upgrade when buying the gaming chair, workbench drag-drop
  still snaps (p08b uses its own scene + `pcboard.glb`).
- Old saves must keep working: `load()` in p04 migrates — never rename existing state
  fields, only add with defaults.
