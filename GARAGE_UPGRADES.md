# GarageUpgrades — on-chain persistence for garage add-ons

## The bug this fixes
In **LIVE mode** the farm (rigs, components, badge, tower) is rebuilt from your
wallet on every sync, so it always comes back. The garage add-ons — **Power
Grid, Cooling, Garage Expansion, Rack Expansion** — were the exception: they
were paid for with real WATT, but the resulting *level* was stored **only in the
browser's localStorage** (`S.upg`). The on-chain payment just funded the stakers
pool with a bare WATT amount — nothing recorded *what* you bought. So a cleared
cache, a different device/browser, or a silently-failed `localStorage` write
reset the add-ons to 0 while the chain-backed farm survived.

## The fix
`contracts/game/GarageUpgrades.sol` stores each wallet's add-on **levels** and a
**prepaid WATT credit** balance **on-chain**, and forwards every WATT spent into
the **same `WattStakingPool`** the game already funds (`fund()`), so stakers keep
earning exactly as before. The game reads the levels back on every LIVE sync, so
add-ons now persist like NFTs.

- Kinds: `power=0, cooling=1, rack=2, rackgpu=3`.
- Prices mirror `CFG.upPrice` / `CFG.upGrowth` exactly (verified by
  `test/GarageUpgrades.test.js`). power/cooling grow ×2.25 per level forever;
  rack max 2, rackgpu max 5.
- `topUp(whole)` loads prepaid credit (one signed transfer, funds stakers now);
  later `buyUpgrade(kind)` spends credit with no transfer, else pulls the exact
  price from the wallet.

## Deploy (per chain)
Needs `PRIVATE_KEY` in `.env` (the deployer becomes the owner that can run
restores) and gas on the target chain.

```bash
npm install
npx hardhat run scripts/deploy-garage-upgrades.js --network polygon
npx hardhat run scripts/deploy-garage-upgrades.js --network altcoinchain
npx hardhat run scripts/deploy-garage-upgrades.js --network wattxchain
```

It wires each deployment to that chain's existing `economy.wattV2` +
`economy.stakingPool` and saves `deployments/garage-upgrades.<network>.json`.

**BSV:** not supported. BSV is not EVM and the game has no BSV economy/staking
contracts (BSV appears only as a PayoutHub payout target), so this Solidity
contract cannot deploy there and the game does not read BSV state for add-ons.
Persisting add-ons on BSV would need a separate BSV-native mechanism.

## Activate in the game
Paste each printed address into the matching chain's `economy.garageUpgrades`
in `game/parts/p09b_web3.html` (currently `null`), then rebuild:

```bash
cd game && ./build.sh
```

While `garageUpgrades` is `null` the game falls back to the old (local-only)
flow, so there is no regression before you deploy.

## Restore players who already paid
Levels paid for before this contract existed can't be read from the chain — they
were only ever local. Grant them back (no WATT charged) with:

1. Edit `scripts/garage-restore-list.json` (per network). Seeded with the owner
   wallet `0x8324FA247756a9D2Be9D16884f620e65a142E514` at power 16 / cooling 16
   on all three chains — **adjust the levels to what each player actually had**,
   and add others as they report the problem.
2. Run (as the deployer/owner), per chain:

```bash
npx hardhat run scripts/restore-garage-upgrades.js --network polygon
npx hardhat run scripts/restore-garage-upgrades.js --network altcoinchain
npx hardhat run scripts/restore-garage-upgrades.js --network wattxchain
```

`restoreLevels` is a **floor** — it never lowers a level a wallet already holds
on-chain, so it is safe to re-run as more reports come in. Affected players see
their add-ons on their next LIVE sync.
