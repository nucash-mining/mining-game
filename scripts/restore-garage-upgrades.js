import hre from "hardhat";
import fs from "fs";

/**
 * Restore garage add-on levels for players who paid BEFORE GarageUpgrades
 * existed (their levels lived only in localStorage and were lost). Grants the
 * levels on-chain WITHOUT charging WATT again — they already paid.
 *
 * Reads scripts/garage-restore-list.json (per-network wallet + level entries),
 * and the deployed address from deployments/garage-upgrades.<network>.json.
 * Only the contract owner (the deployer) can run this. Safe to re-run: levels
 * are a floor and are never lowered.
 *
 * Usage:
 *   npx hardhat run scripts/restore-garage-upgrades.js --network polygon
 */
/* Gas overrides with a floor, so chains with a minimum fee (e.g. Polygon's
   25 gwei priority-fee minimum) don't reject an under-priced auto-estimate.
   EIP-1559 where supported, legacy gasPrice otherwise. */
async function gasOverrides() {
  const fd = await hre.ethers.provider.getFeeData();
  const floor = hre.ethers.parseUnits("30", "gwei");
  if (fd.maxFeePerGas && fd.maxPriorityFeePerGas) {
    const tip = fd.maxPriorityFeePerGas > floor ? fd.maxPriorityFeePerGas : floor;
    const maxFee = fd.maxFeePerGas > tip ? fd.maxFeePerGas : tip * 2n;
    return { maxPriorityFeePerGas: tip, maxFeePerGas: maxFee };
  }
  if (fd.gasPrice) return { gasPrice: fd.gasPrice > floor ? fd.gasPrice : floor };
  return {};
}

async function main() {
  const net = hre.network.name;

  const depPath = `./deployments/garage-upgrades.${net}.json`;
  if (!fs.existsSync(depPath)) throw new Error(`Missing ${depPath}. Deploy first with deploy-garage-upgrades.js.`);
  const { garageUpgrades } = JSON.parse(fs.readFileSync(depPath, "utf8"));

  const list = JSON.parse(fs.readFileSync("./scripts/garage-restore-list.json", "utf8"));
  const entries = (list[net] || []).filter((e) => e && e.wallet);
  if (entries.length === 0) { console.log(`No restore entries for "${net}" — nothing to do.`); return; }

  const [signer] = await hre.ethers.getSigners();
  const garage = await hre.ethers.getContractAt("contracts/game/GarageUpgrades.sol:GarageUpgrades", garageUpgrades, signer);

  const owner = await garage.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase())
    throw new Error(`Signer ${signer.address} is not the contract owner (${owner}). Use the deployer key.`);

  console.log(`Restoring ${entries.length} wallet(s) on ${net} via ${garageUpgrades}:`);
  for (const e of entries) console.log(`  ${e.wallet}  power=${e.power||0} cooling=${e.cooling||0} rack=${e.rack||0} rackgpu=${e.rackgpu||0}${e.note?`  (${e.note})`:""}`);

  const users   = entries.map((e) => e.wallet);
  const power   = entries.map((e) => e.power   || 0);
  const cooling = entries.map((e) => e.cooling || 0);
  const rack    = entries.map((e) => e.rack    || 0);
  const rackgpu = entries.map((e) => e.rackgpu || 0);

  const tx = await garage.restoreLevelsMany(users, power, cooling, rack, rackgpu, await gasOverrides());
  console.log("\n⛓ tx:", tx.hash, "— waiting…");
  await tx.wait();
  console.log("✅ Restore confirmed. Affected players see their add-ons on the next LIVE sync.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
