import hre from "hardhat";
import fs from "fs";

/**
 * Deploy GarageUpgrades — on-chain persistence for garage add-ons
 * (Power Grid, Cooling, Garage Expansion, Rack Expansion).
 *
 * It is wired to the SAME WATT v2 token and WattStakingPool the game already
 * funds, so WATT spent on upgrades keeps flowing to stakers exactly as before.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-garage-upgrades.js --network polygon
 *   npx hardhat run scripts/deploy-garage-upgrades.js --network altcoinchain
 *
 * After it prints the address, paste it into the game config:
 *   game/parts/p09b_web3.html  →  economy:{ … , garageUpgrades:'0x…' }
 * for the matching chain. See GARAGE_UPGRADES.md.
 */

// economy addresses the GAME uses (from game/parts/p09b_web3.html WEB3CFG).
// These are the WATT v2 token + WattStakingPool the game pays into today.
const ECONOMY = {
  polygon:      { wattV2: "0x387693eCEC037C61943404F03c097d2ADA15ae3f", stakingPool: "0x7E8FC9d7D7588F410E1399aC690F901268B08a8d" },
  altcoinchain: { wattV2: "0xB7635E386283CAE6FB1A710f19CaA8220beF630D", stakingPool: "0xa3f8B04310380cD13Ec85B11420d1fc848af36C4" },
  wattxchain:   { wattV2: "0xc4603E2582aE320857379819123dFbFd3093dcfa", stakingPool: "0xe9000a1ba29c3e87B4F964E9514eA4e8fd5d5749" },
};

async function main() {
  const net = hre.network.name;
  const eco = ECONOMY[net];
  if (!eco) throw new Error(`No economy addresses configured for network "${net}". Add them to ECONOMY in this script.`);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Network :", net);
  console.log("Deployer:", deployer.address, "(becomes contract owner — able to run restores)");
  console.log("WATT v2 :", eco.wattV2);
  console.log("Stakers :", eco.stakingPool);

  const Garage = await hre.ethers.getContractFactory("contracts/game/GarageUpgrades.sol:GarageUpgrades");
  const garage = await Garage.deploy(eco.wattV2, eco.stakingPool);
  await garage.waitForDeployment();
  const addr = await garage.getAddress();

  console.log("\n✅ GarageUpgrades deployed to:", addr);
  console.log("\nNext steps:");
  console.log(`  1. Set economy.garageUpgrades = '${addr}' for '${net}' in game/parts/p09b_web3.html`);
  console.log(`  2. Rebuild the game HTML (game/build.sh).`);
  console.log(`  3. Restore players who paid before this existed:`);
  console.log(`       npx hardhat run scripts/restore-garage-upgrades.js --network ${net}`);

  const out = `./deployments/garage-upgrades.${net}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(out, JSON.stringify({
    network: net, chainId: hre.network.config.chainId, deployer: deployer.address,
    garageUpgrades: addr, wattV2: eco.wattV2, stakingPool: eco.stakingPool,
    timestamp: new Date().toISOString(),
  }, null, 2));
  console.log(`\nSaved ${out}`);
  return addr;
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
