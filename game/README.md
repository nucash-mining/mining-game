# The Mining Game — WATT Tycoon (3D browser game)

A single-file 3D crypto-mining simulator built from the real Mining Game NFT hardware models
in this repo. Live at **https://mining-game.games.bu.app/**

- Mint the free Gaming PC (real ERC-1155 #1), install real CPUs/GPUs/ASICs on a drag-and-drop
  workbench built around the 20_PC_Board model
- WATT is electricity: rigs burn it mining, stake weight regenerates it
- Three networks: Polygon, Altcoinchain, WATTxchain (testnet sim) — plus the live
  hybrid PoW/PoS fork at ALT block 7,000,000 with 32-ALT validator nodes
- Mining pools (join NPC pools or host your own with a 100k WATT + 100k coin lock),
  WATT burn economics, rig wear & repair, per-rig power/stake toggle
- In-game "Mining Game OS" per rig: overclocking (TuneX), DEX (SwapinDEX), wallet, miner terminal
- Real web3: EIP-1193 wallet connect, reads the deployed Polygon/Altcoinchain contracts,
  owned NFTs grant in-game twins, real gas-free freemint

## Layout

```
game/
  mining-game.html   built, playable single file (open it in a browser)
  build.sh           concatenates parts/ -> mining-game.html + syntax check
  parts/p01..p15     the source, split into ordered sections
  tools/posetest.mjs regression harness for the component POSE system
  CLAUDE.md          task list for finishing the asset work (Blender etc.)
```

## Component orientation (the POSE table)

The hardware GLBs were authored in different orientations, so every mount used
to guess how a card should sit. One table in `parts/p04_data.html` — `PART_POSE`
— now owns it, and **POSE LAB** (hotkey `P`, or GARAGE → Pose Lab) is where you
set it: pick a mount (open-air frame, PCIe slot, server tower board, server
tower bay, CPU socket, floor pad) and a component, turn it with the buttons or
the keyboard, and watch every rig in the farm update.

The Server Tower shows its build: install CPUs and GPUs on its board and the
case goes smoked-glass with the hardware inside — the motherboard standing on
its tray and the cards plugged into stacked PCIe slots, laid out the way a real
tower is. Edits are saved per player in `S.pose`;
**EXPORT TABLE** copies a replacement `PART_POSE` to paste back into
`parts/p04_data.html` so your calibration ships as the default.

Fans spin, too: the hardware models' own blades are lifted out of the mesh at
load and turn clockwise whenever a rig is actually mining, stopping dead when it
is off, crashed, worn out or out of WATT.

The Server Tower is a full rig now, not just a display case: click it for its
own panel — stats, power toggle, wear/repair, move — and **LOG IN — TOWER OS**
for the same Mining Game OS a Gaming PC gets (Miner terminal with per-tower
network selection, TuneX overclocking, SwapinDEX, wallet). Its hash actually
mines in DEMO mode now, including tower-only saves with no Gaming PC at all.

Run `node tools/posetest.mjs` after touching the table or any mount code.

## Controls

| | |
|---|---|
| **W A S D** / **W A D X** / **arrow keys** | walk |
| **shift** | run |
| drag | look · scroll: zoom |
| click a chair | sit at that desk · **esc** stands up |
| **1** shop · **2** garage · **3** pools · **4** stats · **5** wallet | menus |
| **B** workbench · **O** rig OS · **P** pose lab · **N** switch network | |

> Menu hotkeys moved to the number row in 2026-07: `W` (wallet) and `S` (shop)
> collided head-on with walking forward and back.

## Build

```
./build.sh          # needs node + python3
```

Edit `parts/`, never `mining-game.html` — that file is generated. `build.sh` must
print `BUILD OK`.

## Deployed contracts

Mining Game v2 is deployed with CREATE2 from a dedicated deployer at nonce 0, so
**every address is identical on every chain**. Live on Altcoinchain (2330):

| contract | address |
|---|---|
| CREATE2 factory | `0x99eA4646D84bcf2A57478F088F8083EBd1F55Ef2` |
| WATTv2 | `0x83c1A4a920d9772CB14685433C178e83955EF6b7` |
| MiningGameNFTv2 | `0x01d001e51BB23ba3bD0930D8b69668386419368c` |
| MiningGameMigrator | `0xF9E8FA22d96D1E1655309D668fC698485e468232` |
| MiningGameStakerV2 | `0x084b6Bd9e72335555883c3Adb04568eC6409A235` |
| Marketplace (thirdweb v2) | `0x8F07428E3fd3860220e1B2163215F971171042AA` |

v1 (still live, migrate from these): WATT `0x6645143e49B3a15d8F205658903a55E520444698`,
NFT `0xf9670e5D46834561813CA79854B3d7147BBbFfb2` on Altcoinchain; WATT
`0xE960d5076cd3169C343Ee287A2c3380A222e5839`, NFT
`0x970A8b10147E3459D3CBF56329B76aC18D329728` on Polygon.

Contract source + deploy scripts live in a separate repo (`mining-game-v2`); the
marketplace is thirdweb Marketplace v2 with a local zero-fee oracle, because
thirdweb's own fee contract does not exist on Altcoinchain and every sale reverts
without one.

RPCs the game uses: Altcoinchain `https://rpc.wattxchange.app`, Polygon
`https://polygon.drpc.org`. (`rpc.altcoinchain.org` and `polygon-rpc.com` are both
dead — do not put them back.)

## 3D assets

The game loads GLBs from its own origin (same files as this repo, optimized with
gltfpack/meshopt to fit a 2 MB per-asset limit):
pc.glb, cpu.glb, gpu_tx120.glb, gpu_gp50.glb, gen2.glb (all Gen2 components merged,
one scene per component), pcboard.glb.

Furniture & farm structures (built programmatically by `tools/asset-factory.html` —
three.js + GLTFExporter in a browser page, real-scale meters, the game scales ×2.25):
desk.glb, monitor.glb (screen mesh `SCREEN` carries the live terminal texture),
chair_desk.glb, chair_gaming.glb, server_rack.glb (shelf meshes `SHELF_0/1/2` slide to
SLOTS heights), container.glb (20ft HC, open end −Z), warehouse.glb (open front −Z,
gable roof). Every one has a procedural fallback in code, so the game still runs if an
asset 404s. Loads are parallel and per-asset fault-tolerant (`loadModels` in p07).

The economy/config is one `CFG` block at the top of `parts/p04_data.html` — it is the
living spec for the real WATTxchain contracts (pool operator locks, fee markets,
WATT burn, validator staking).
