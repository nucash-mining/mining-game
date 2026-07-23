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
  parts/p01..p12     the source, split into ordered sections
  CLAUDE.md          task list for finishing the asset work (Blender etc.)
```

## Build

```
./build.sh          # needs node + python3
```

## 3D assets

The game loads GLBs from its own origin (same files as this repo, optimized with
gltfpack/meshopt to fit a 2 MB per-asset limit):
pc.glb, cpu.glb, gpu_tx120.glb, gpu_gp50.glb, gen2.glb (all Gen2 components merged,
one scene per component), pcboard.glb.

The economy/config is one `CFG` block at the top of `parts/p04_data.html` — it is the
living spec for the real WATTxchain contracts (pool operator locks, fee markets,
WATT burn, validator staking).
