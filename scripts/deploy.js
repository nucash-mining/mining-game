import hre from "hardhat";
import fs from "fs";

/**
 * Deploy Mining Game Contracts
 *
 * Deployment order:
 * 1. MiningRigNFT (or use existing)
 * 2. GamePool
 * 3. MiningEngine (needs WATT, NFT, GamePool addresses)
 * 4. StakingPool (needs WATT address)
 * 5. MergedMiningRewardsV2
 * 6. PoolRegistry (pool operator staking with WATT)
 * 7. WTXBridge (WTX ↔ WATT exchange)
 * 8. Configure cross-contract references
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", hre.network.name);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Configuration
  const config = getNetworkConfig(hre.network.name);
  console.log("\nUsing configuration:");
  console.log("  WATT Token:", config.wattToken || "Will deploy mock");
  console.log("  Existing NFT:", config.existingNFT || "Will deploy new");

  // Track deployed contracts
  const deployed = {};

  // 1. Deploy or use existing WATT token
  if (config.wattToken) {
    deployed.wattToken = config.wattToken;
    console.log("\nUsing existing WATT token:", deployed.wattToken);
  } else {
    console.log("\nDeploying MockWATT token...");
    const MockWATT = await hre.ethers.getContractFactory("testing/MockWATT");
    const watt = await MockWATT.deploy();
    await watt.waitForDeployment();
    deployed.wattToken = await watt.getAddress();
    console.log("  MockWATT deployed to:", deployed.wattToken);
  }

  // 2. Deploy or use existing MiningRigNFT
  if (config.existingNFT) {
    deployed.rigNFT = config.existingNFT;
    console.log("\nUsing existing MiningRigNFT:", deployed.rigNFT);
  } else {
    console.log("\nDeploying MiningRigNFT...");
    const MiningRigNFT = await hre.ethers.getContractFactory("nfts/MiningRigNFT");
    const rigNFT = await MiningRigNFT.deploy();
    await rigNFT.waitForDeployment();
    deployed.rigNFT = await rigNFT.getAddress();
    console.log("  MiningRigNFT deployed to:", deployed.rigNFT);
  }

  // 3. Deploy GamePool
  console.log("\nDeploying GamePool...");
  const GamePool = await hre.ethers.getContractFactory("game/GamePool");
  const gamePool = await GamePool.deploy();
  await gamePool.waitForDeployment();
  deployed.gamePool = await gamePool.getAddress();
  console.log("  GamePool deployed to:", deployed.gamePool);

  // 4. Deploy MiningEngine
  console.log("\nDeploying MiningEngine...");
  const MiningEngine = await hre.ethers.getContractFactory("game/MiningEngine");
  const miningEngine = await MiningEngine.deploy(
    deployed.wattToken,
    deployed.gamePool
  );
  await miningEngine.waitForDeployment();
  deployed.miningEngine = await miningEngine.getAddress();
  console.log("  MiningEngine deployed to:", deployed.miningEngine);

  // 5. Deploy StakingPool
  console.log("\nDeploying StakingPool...");
  const StakingPool = await hre.ethers.getContractFactory("game/StakingPool");
  const stakingPool = await StakingPool.deploy(deployed.wattToken);
  await stakingPool.waitForDeployment();
  deployed.stakingPool = await stakingPool.getAddress();
  console.log("  StakingPool deployed to:", deployed.stakingPool);

  // 6. Deploy MergedMiningRewardsV2
  console.log("\nDeploying MergedMiningRewardsV2...");
  const RewardsV2 = await hre.ethers.getContractFactory("MergedMiningRewardsV2");
  const rewardsV2 = await RewardsV2.deploy();
  await rewardsV2.waitForDeployment();
  deployed.rewardsV2 = await rewardsV2.getAddress();
  console.log("  MergedMiningRewardsV2 deployed to:", deployed.rewardsV2);

  // 7. Deploy PoolRegistry (pool operator staking)
  console.log("\nDeploying PoolRegistry...");
  const PoolRegistry = await hre.ethers.getContractFactory("game/PoolRegistry");
  const poolRegistry = await PoolRegistry.deploy(deployed.wattToken);
  await poolRegistry.waitForDeployment();
  deployed.poolRegistry = await poolRegistry.getAddress();
  console.log("  PoolRegistry deployed to:", deployed.poolRegistry);

  // 8. Deploy WTXBridge (WTX ↔ WATT exchange)
  console.log("\nDeploying WTXBridge...");
  const WTXBridge = await hre.ethers.getContractFactory("game/WTXBridge");
  const wtxBridge = await WTXBridge.deploy(deployed.wattToken);
  await wtxBridge.waitForDeployment();
  deployed.wtxBridge = await wtxBridge.getAddress();
  console.log("  WTXBridge deployed to:", deployed.wtxBridge);

  // 9. Configure cross-contract references
  console.log("\nConfiguring contracts...");

  // Set MiningEngine on GamePool
  console.log("  Setting MiningEngine on GamePool...");
  const gamePoolContract = await hre.ethers.getContractAt("game/GamePool", deployed.gamePool);
  await (await gamePoolContract.setMiningEngine(deployed.miningEngine)).wait();

  // Set StakingPool on MiningEngine
  console.log("  Setting StakingPool on MiningEngine...");
  const miningEngineContract = await hre.ethers.getContractAt("game/MiningEngine", deployed.miningEngine);
  await (await miningEngineContract.setStakingPool(deployed.stakingPool)).wait();

  // Add NFT contract to MiningEngine
  console.log("  Adding NFT contract to MiningEngine...");
  await (await miningEngineContract.addNFTContract(deployed.rigNFT)).wait();

  // Add NFT contract to StakingPool
  console.log("  Adding NFT contract to StakingPool...");
  const stakingPoolContract = await hre.ethers.getContractAt("game/StakingPool", deployed.stakingPool);
  await (await stakingPoolContract.addNFTContract(deployed.rigNFT)).wait();

  // Set MiningEngine on StakingPool
  console.log("  Setting MiningEngine on StakingPool...");
  await (await stakingPoolContract.setMiningEngine(deployed.miningEngine)).wait();

  // Authorize game contracts on NFT
  if (!config.existingNFT) {
    console.log("  Authorizing contracts on MiningRigNFT...");
    const rigNFTContract = await hre.ethers.getContractAt("nfts/MiningRigNFT", deployed.rigNFT);
    await (await rigNFTContract.setAuthorizedContract(deployed.miningEngine, true)).wait();
    await (await rigNFTContract.setAuthorizedContract(deployed.stakingPool, true)).wait();
  }

  // 10. Print deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nNetwork:", hre.network.name);
  console.log("\nDeployed Contracts:");
  console.log("  WATT Token:           ", deployed.wattToken);
  console.log("  Mining Rig NFT:       ", deployed.rigNFT);
  console.log("  Game Pool:            ", deployed.gamePool);
  console.log("  Mining Engine:        ", deployed.miningEngine);
  console.log("  Staking Pool:         ", deployed.stakingPool);
  console.log("  Merged Rewards V2:    ", deployed.rewardsV2);
  console.log("  Pool Registry:        ", deployed.poolRegistry);
  console.log("  WTX Bridge:           ", deployed.wtxBridge);

  console.log("\n" + "=".repeat(60));
  console.log("ENVIRONMENT VARIABLES (for pool server)");
  console.log("=".repeat(60));
  console.log(`WATT_CONTRACT=${deployed.wattToken}`);
  console.log(`RIG_NFT_CONTRACT=${deployed.rigNFT}`);
  console.log(`GAME_POOL_CONTRACT=${deployed.gamePool}`);
  console.log(`MINING_ENGINE_CONTRACT=${deployed.miningEngine}`);
  console.log(`STAKING_POOL_CONTRACT=${deployed.stakingPool}`);
  console.log(`REWARDS_V2_CONTRACT=${deployed.rewardsV2}`);
  console.log(`POOL_REGISTRY_CONTRACT=${deployed.poolRegistry}`);
  console.log(`WTX_BRIDGE_CONTRACT=${deployed.wtxBridge}`);

  // Save deployment info
  const deploymentPath = `./deployments/${hre.network.name}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify({
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployed,
  }, null, 2));
  console.log(`\nDeployment info saved to ${deploymentPath}`);

  return deployed;
}

function getNetworkConfig(network) {
  const configs = {
    // Polygon - use existing deployed contracts
    polygon: {
      wattToken: "0xE960d5076cd3169C343Ee287A2c3380A222e5839",
      existingNFT: "0x970a8b10147e3459d3cbf56329b76ac18d329728",
    },
    // Altcoinchain - use existing deployed contracts
    altcoinchain: {
      wattToken: "0x6645143e49B3a15d8F205658903a55E520444698",
      existingNFT: "0xf9670e5D46834561813CA79854B3d7147BBbFfb2",
    },
    // Local/test - deploy everything fresh
    localhost: {},
    hardhat: {},
    wattx_local: {},
    wattx_testnet: {},
    wattx_mainnet: {},
  };

  return configs[network] || {};
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
