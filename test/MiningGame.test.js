import { expect } from "chai";
import hre from "hardhat";

describe("Mining Game System", function () {
  let owner, user1, user2, operator;
  let watt, rigNFT, gamePool, miningEngine, stakingPool, poolRegistry, wtxBridge;

  const REQUIRED_STAKE = hre.ethers.parseEther("100000"); // 100,000 WATT
  const MINT_PRICE = hre.ethers.parseEther("0.1");

  beforeEach(async function () {
    [owner, user1, user2, operator] = await hre.ethers.getSigners();

    // Deploy MockWATT
    const MockWATT = await hre.ethers.getContractFactory("contracts/testing/MockWATT.sol:MockWATT");
    watt = await MockWATT.deploy();
    await watt.waitForDeployment();

    // Deploy MiningRigNFT
    const MiningRigNFT = await hre.ethers.getContractFactory("contracts/nfts/MiningRigNFT.sol:MiningRigNFT");
    rigNFT = await MiningRigNFT.deploy();
    await rigNFT.waitForDeployment();

    // Deploy GamePool
    const GamePool = await hre.ethers.getContractFactory("contracts/game/GamePool.sol:GamePool");
    gamePool = await GamePool.deploy();
    await gamePool.waitForDeployment();

    // Deploy MiningEngine
    const MiningEngine = await hre.ethers.getContractFactory("contracts/game/MiningEngine.sol:MiningEngine");
    miningEngine = await MiningEngine.deploy(await watt.getAddress(), await gamePool.getAddress());
    await miningEngine.waitForDeployment();

    // Deploy StakingPool
    const StakingPool = await hre.ethers.getContractFactory("contracts/game/StakingPool.sol:StakingPool");
    stakingPool = await StakingPool.deploy(await watt.getAddress());
    await stakingPool.waitForDeployment();

    // Deploy PoolRegistry
    const PoolRegistry = await hre.ethers.getContractFactory("contracts/game/PoolRegistry.sol:PoolRegistry");
    poolRegistry = await PoolRegistry.deploy(await watt.getAddress());
    await poolRegistry.waitForDeployment();

    // Deploy WTXBridge
    const WTXBridge = await hre.ethers.getContractFactory("contracts/game/WTXBridge.sol:WTXBridge");
    wtxBridge = await WTXBridge.deploy(await watt.getAddress());
    await wtxBridge.waitForDeployment();

    // Configure contracts
    await gamePool.setMiningEngine(await miningEngine.getAddress());
    await miningEngine.setStakingPool(await stakingPool.getAddress());
    await miningEngine.addNFTContract(await rigNFT.getAddress());
    await stakingPool.addNFTContract(await rigNFT.getAddress());
    await stakingPool.setMiningEngine(await miningEngine.getAddress());
    await rigNFT.setAuthorizedContract(await miningEngine.getAddress(), true);
    await rigNFT.setAuthorizedContract(await stakingPool.getAddress(), true);

    // Mint WATT to users for testing
    await watt.mint(user1.address, hre.ethers.parseEther("1000000"));
    await watt.mint(user2.address, hre.ethers.parseEther("1000000"));
    await watt.mint(operator.address, hre.ethers.parseEther("1000000"));
  });

  describe("MiningRigNFT", function () {
    it("should mint an NFT with traits", async function () {
      const tx = await rigNFT.connect(user1).mint({ value: MINT_PRICE });
      const receipt = await tx.wait();

      expect(await rigNFT.ownerOf(1)).to.equal(user1.address);

      const traits = await rigNFT.getRigTraits(1);
      expect(traits.hashRate).to.be.gt(0);
      expect(traits.algorithm).to.be.lt(7);
      expect(traits.rarity).to.be.lte(4);
    });

    it("should batch mint NFTs", async function () {
      const tx = await rigNFT.connect(user1).mintBatch(3, { value: MINT_PRICE * 3n });
      await tx.wait();

      expect(await rigNFT.balanceOf(user1.address)).to.equal(3);
    });

    it("should calculate effective power", async function () {
      await rigNFT.connect(user1).mint({ value: MINT_PRICE });
      const power = await rigNFT.getEffectivePower(1);
      expect(power).to.be.gt(0);
    });

    it("should get WATT per hour", async function () {
      await rigNFT.connect(user1).mint({ value: MINT_PRICE });
      const wattPerHour = await rigNFT.getWattPerHour(1);
      expect(wattPerHour).to.be.gte(hre.ethers.parseEther("100"));
      expect(wattPerHour).to.be.lte(hre.ethers.parseEther("5000"));
    });
  });

  describe("PoolRegistry", function () {
    const poolName = "Test Pool";
    const poolDesc = "A test mining pool";
    const stratumEndpoint = "stratum+tcp://pool.test.com:3333";
    const nodeRpcEndpoint = "http://node.test.com:1337";
    const nodeP2pEndpoint = "enode://abc123@1.2.3.4:30303";
    const feePercent = 100; // 1%
    const minPayout = hre.ethers.parseEther("0.01");
    const algorithms = [0, 1, 2]; // SHA256D, Scrypt, Ethash

    it("should register a pool with node", async function () {
      await watt.connect(operator).approve(await poolRegistry.getAddress(), REQUIRED_STAKE);

      await poolRegistry.connect(operator).registerPoolWithNode(
        poolName, poolDesc, stratumEndpoint, nodeRpcEndpoint, nodeP2pEndpoint,
        feePercent, minPayout, algorithms
      );

      const pool = await poolRegistry.getPool(operator.address);
      expect(pool.name).to.equal(poolName);
      expect(pool.feePercent).to.equal(feePercent);
      expect(pool.stakedAmount).to.equal(REQUIRED_STAKE);
    });

    it("should reject registration without enough stake", async function () {
      await watt.connect(user1).approve(await poolRegistry.getAddress(), REQUIRED_STAKE / 2n);

      await expect(
        poolRegistry.connect(user1).registerPoolWithNode(
          poolName, poolDesc, stratumEndpoint, nodeRpcEndpoint, nodeP2pEndpoint,
          feePercent, minPayout, algorithms
        )
      ).to.be.reverted;
    });

    it("should submit heartbeat", async function () {
      await watt.connect(operator).approve(await poolRegistry.getAddress(), REQUIRED_STAKE);
      await poolRegistry.connect(operator).registerPoolWithNode(
        poolName, poolDesc, stratumEndpoint, nodeRpcEndpoint, nodeP2pEndpoint,
        feePercent, minPayout, algorithms
      );

      await poolRegistry.connect(operator).submitHeartbeat(operator.address, 12345);

      const node = await poolRegistry.getNode(operator.address);
      expect(node.reportedBlockHeight).to.equal(12345);
      expect(await poolRegistry.isNodeOnline(operator.address)).to.be.true;
    });

    it("should request and complete unstake after hold period", async function () {
      await watt.connect(operator).approve(await poolRegistry.getAddress(), REQUIRED_STAKE);
      await poolRegistry.connect(operator).registerPoolWithNode(
        poolName, poolDesc, stratumEndpoint, nodeRpcEndpoint, nodeP2pEndpoint,
        feePercent, minPayout, algorithms
      );

      await poolRegistry.connect(operator).requestUnstake();

      const pool = await poolRegistry.getPool(operator.address);
      expect(pool.status).to.equal(3); // UNSTAKING

      // Fast forward 90 days
      await hre.network.provider.send("evm_increaseTime", [90 * 24 * 60 * 60 + 1]);
      await hre.network.provider.send("evm_mine");

      const balanceBefore = await watt.balanceOf(operator.address);
      await poolRegistry.connect(operator).completeUnstake();
      const balanceAfter = await watt.balanceOf(operator.address);

      expect(balanceAfter - balanceBefore).to.equal(REQUIRED_STAKE);
    });
  });

  describe("WTXBridge", function () {
    const swapAmount = hre.ethers.parseEther("1000");

    beforeEach(async function () {
      // Add liquidity to bridge
      await watt.connect(owner).mint(owner.address, hre.ethers.parseEther("1000000"));
      await watt.connect(owner).approve(await wtxBridge.getAddress(), hre.ethers.parseEther("1000000"));
      await wtxBridge.connect(owner).addLiquidity(hre.ethers.parseEther("1000000"));
    });

    it("should request WTX to WATT swap", async function () {
      const wtxTxHash = "0x1234567890abcdef";

      await wtxBridge.connect(user1).requestWtxToWatt(swapAmount, wtxTxHash);

      const request = await wtxBridge.getSwapRequest(1);
      expect(request.user).to.equal(user1.address);
      expect(request.amount).to.equal(swapAmount);
      expect(request.status).to.equal(0); // PENDING
    });

    it("should request WATT to WTX swap", async function () {
      const wtxAddress = "WTX1234567890abcdef";

      await watt.connect(user1).approve(await wtxBridge.getAddress(), swapAmount);
      await wtxBridge.connect(user1).requestWattToWtx(swapAmount, wtxAddress);

      const request = await wtxBridge.getSwapRequest(1);
      expect(request.user).to.equal(user1.address);
      expect(request.amount).to.equal(swapAmount);
    });

    it("should complete swap as operator", async function () {
      const wtxTxHash = "0x1234567890abcdef";
      await wtxBridge.connect(user1).requestWtxToWatt(swapAmount, wtxTxHash);

      const balanceBefore = await watt.balanceOf(user1.address);
      await wtxBridge.connect(owner).completeSwap(1);
      const balanceAfter = await watt.balanceOf(user1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);

      const request = await wtxBridge.getSwapRequest(1);
      expect(request.status).to.equal(1); // COMPLETED
    });

    it("should get quote for swap", async function () {
      const [outputAmount, fee] = await wtxBridge.getQuote(0, swapAmount); // WTX_TO_WATT
      expect(outputAmount).to.be.gt(0);
      expect(fee).to.be.gt(0);
      expect(outputAmount + fee).to.equal(swapAmount);
    });
  });

  describe("GamePool", function () {
    it("should report deposits as operator", async function () {
      await gamePool.setOperator(operator.address, true);

      await gamePool.connect(operator).reportDeposit(0, 1000000); // BTC, 0.01 BTC in satoshis

      const balance = await gamePool.getCoinBalance(0);
      expect(balance).to.equal(1000000);
    });

    it("should map algorithm to coin", async function () {
      // Coin enum: BTC=0, LTC=1, XMR=2, ETC=3, KAS=4, DASH=5, ALT=6
      expect(await gamePool.getCoinForAlgorithm(0)).to.equal(0); // SHA256D -> BTC
      expect(await gamePool.getCoinForAlgorithm(1)).to.equal(1); // Scrypt -> LTC
      expect(await gamePool.getCoinForAlgorithm(3)).to.equal(2); // RandomX -> XMR (enum value 2)
    });
  });

  describe("MiningEngine", function () {
    let tokenId;
    const wattDeposit = hre.ethers.parseEther("10000");

    beforeEach(async function () {
      // Mint an NFT
      await rigNFT.connect(user1).mint({ value: MINT_PRICE });
      tokenId = 1;

      // Approve WATT
      await watt.connect(user1).approve(await miningEngine.getAddress(), wattDeposit);
    });

    it("should start mining", async function () {
      // Approve NFT transfer
      await rigNFT.connect(user1).approve(await miningEngine.getAddress(), tokenId);

      await miningEngine.connect(user1).startMining(await rigNFT.getAddress(), tokenId, wattDeposit);

      expect(await rigNFT.isMining(tokenId)).to.be.true;
      expect(await rigNFT.ownerOf(tokenId)).to.equal(await miningEngine.getAddress());
    });

    it("should stop mining and return NFT", async function () {
      // Add deposits to GamePool so rewards can be claimed
      await gamePool.setOperator(owner.address, true);
      // Deposit to all coin types to ensure we have balance regardless of NFT algorithm
      for (let i = 0; i < 7; i++) {
        await gamePool.connect(owner).reportDeposit(i, hre.ethers.parseEther("1000000"));
      }

      await rigNFT.connect(user1).approve(await miningEngine.getAddress(), tokenId);
      await miningEngine.connect(user1).startMining(await rigNFT.getAddress(), tokenId, wattDeposit);

      // Fast forward 1 hour
      await hre.network.provider.send("evm_increaseTime", [3600]);
      await hre.network.provider.send("evm_mine");

      await miningEngine.connect(user1).stopMining(await rigNFT.getAddress(), tokenId);

      expect(await rigNFT.isMining(tokenId)).to.be.false;
      expect(await rigNFT.ownerOf(tokenId)).to.equal(user1.address);
    });

    it("should calculate remaining WATT", async function () {
      await rigNFT.connect(user1).approve(await miningEngine.getAddress(), tokenId);
      await miningEngine.connect(user1).startMining(await rigNFT.getAddress(), tokenId, wattDeposit);

      const remaining = await miningEngine.getRemainingWatt(await rigNFT.getAddress(), tokenId);
      expect(remaining).to.be.lte(wattDeposit);
    });
  });

  describe("StakingPool", function () {
    let tokenId;

    beforeEach(async function () {
      // Mint an NFT
      await rigNFT.connect(user1).mint({ value: MINT_PRICE });
      tokenId = 1;
    });

    it("should stake NFT", async function () {
      await rigNFT.connect(user1).approve(await stakingPool.getAddress(), tokenId);
      await stakingPool.connect(user1).stake(await rigNFT.getAddress(), tokenId);

      expect(await rigNFT.isStaked(tokenId)).to.be.true;
      expect(await rigNFT.ownerOf(tokenId)).to.equal(await stakingPool.getAddress());
    });

    it("should unstake NFT", async function () {
      await rigNFT.connect(user1).approve(await stakingPool.getAddress(), tokenId);
      await stakingPool.connect(user1).stake(await rigNFT.getAddress(), tokenId);

      await stakingPool.connect(user1).unstake(await rigNFT.getAddress(), tokenId);

      expect(await rigNFT.isStaked(tokenId)).to.be.false;
      expect(await rigNFT.ownerOf(tokenId)).to.equal(user1.address);
    });

    it("should calculate stake weight", async function () {
      const weight = await rigNFT.getStakeWeight(tokenId);
      expect(weight).to.be.gt(0);
    });
  });
});
