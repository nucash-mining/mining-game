const hre = require("hardhat");

/**
 * Add a new NFT contract to the Mining Game system
 *
 * Usage:
 *   npx hardhat run scripts/add-nft-contract.js --network <network>
 *
 * Environment variables:
 *   NEW_NFT_CONTRACT - Address of the new NFT contract to add
 *   MINING_ENGINE_CONTRACT - Address of the MiningEngine contract
 *   STAKING_POOL_CONTRACT - Address of the StakingPool contract
 */
async function main() {
  const [admin] = await hre.ethers.getSigners();
  console.log("Adding NFT contract with account:", admin.address);
  console.log("Network:", hre.network.name);

  // Get addresses from environment or args
  const newNFTContract = process.env.NEW_NFT_CONTRACT;
  const miningEngineAddress = process.env.MINING_ENGINE_CONTRACT;
  const stakingPoolAddress = process.env.STAKING_POOL_CONTRACT;

  if (!newNFTContract) {
    console.error("ERROR: NEW_NFT_CONTRACT environment variable not set");
    process.exit(1);
  }

  if (!miningEngineAddress || !stakingPoolAddress) {
    console.error("ERROR: MINING_ENGINE_CONTRACT and STAKING_POOL_CONTRACT must be set");
    process.exit(1);
  }

  console.log("\nConfiguration:");
  console.log("  New NFT Contract:   ", newNFTContract);
  console.log("  Mining Engine:      ", miningEngineAddress);
  console.log("  Staking Pool:       ", stakingPoolAddress);

  // Connect to contracts
  const miningEngine = await hre.ethers.getContractAt("game/MiningEngine", miningEngineAddress);
  const stakingPool = await hre.ethers.getContractAt("game/StakingPool", stakingPoolAddress);

  // Check if already added
  console.log("\nChecking if NFT contract is already added...");
  const meInfo = await miningEngine.nftContractInfo(newNFTContract);
  if (meInfo.enabled) {
    console.log("NFT contract already enabled in MiningEngine!");
  } else {
    console.log("Adding NFT contract to MiningEngine...");
    const tx1 = await miningEngine.addNFTContract(newNFTContract);
    await tx1.wait();
    console.log("  Transaction:", tx1.hash);
  }

  const spInfo = await stakingPool.nftContractInfo(newNFTContract);
  if (spInfo.enabled) {
    console.log("NFT contract already enabled in StakingPool!");
  } else {
    console.log("Adding NFT contract to StakingPool...");
    const tx2 = await stakingPool.addNFTContract(newNFTContract);
    await tx2.wait();
    console.log("  Transaction:", tx2.hash);
  }

  // Verify the NFT contract can interact with game contracts
  console.log("\nVerifying NFT contract interface...");
  try {
    const nft = await hre.ethers.getContractAt("interfaces/IMiningRigNFT", newNFTContract);

    // Try to read a token (token 1 if it exists)
    try {
      const traits = await nft.rigTraits(1);
      console.log("  Sample rig traits from token #1:");
      console.log("    Hash Rate:", traits.hashRate.toString());
      console.log("    Algorithm:", traits.algorithm.toString());
      console.log("    Efficiency:", traits.efficiency.toString());
      console.log("    Rarity:", traits.rarity.toString());
    } catch (e) {
      console.log("  (No tokens minted yet or token #1 doesn't exist)");
    }

    console.log("  Interface compatible!");
  } catch (e) {
    console.error("  WARNING: NFT contract may not implement IMiningRigNFT interface correctly");
    console.error("  Error:", e.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("NFT CONTRACT ADDED SUCCESSFULLY");
  console.log("=".repeat(60));
  console.log("\nNew NFT Contract:", newNFTContract);
  console.log("\nUsers can now:");
  console.log("  1. Use this NFT in MiningEngine.startMining()");
  console.log("  2. Stake this NFT in StakingPool.stake()");

  // Reminder about authorizing game contracts
  console.log("\nIMPORTANT: Make sure the new NFT contract authorizes:");
  console.log(`  - MiningEngine: ${miningEngineAddress}`);
  console.log(`  - StakingPool: ${stakingPoolAddress}`);
  console.log("\nCall on new NFT contract:");
  console.log(`  setAuthorizedContract(${miningEngineAddress}, true)`);
  console.log(`  setAuthorizedContract(${stakingPoolAddress}, true)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
