// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "../interfaces/IWATT.sol";
import "../interfaces/IMiningRigNFT.sol";
import "./GamePool.sol";

/**
 * @title MiningEngine
 * @dev Virtual mining engine where NFT rigs "mine" from the multi-coin pool
 *
 * Key mechanics:
 * - NFT owners deposit WATT as "electricity" to power their rigs
 * - Rigs consume WATT hourly based on their wattConsumption trait
 * - Rigs earn from the GamePool based on their algorithm trait
 * - Consumed WATT is transferred to the StakingPool for idle NFT stakers
 *
 * SUPPORTS MULTIPLE NFT CONTRACTS:
 * - Owner can add new NFT contract addresses as new rig models are released
 * - Each NFT contract must implement the IMiningRigNFT interface
 */
contract MiningEngine is Ownable, ReentrancyGuard, ERC721Holder {
    // ============================================================================
    // Structs
    // ============================================================================

    struct MiningSession {
        address owner;
        address nftContract;     // Which NFT contract this rig belongs to
        uint256 rigId;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 lastWattCheckTime;  // Last time WATT consumption was calculated
        uint256 wattDeposited;
        uint256 wattConsumed;
        uint256 totalEarned;     // In smallest coin units
        uint8 algorithm;         // Cached from NFT
        bool active;
    }

    struct NFTContractInfo {
        bool enabled;
        uint256 totalRigsMining;
        uint256 addedAt;
    }

    // ============================================================================
    // State Variables
    // ============================================================================

    // Core contracts
    IWATT public immutable wattToken;
    GamePool public immutable gamePool;
    address public stakingPool;

    // Supported NFT contracts (can add new ones later)
    address[] public nftContracts;
    mapping(address => NFTContractInfo) public nftContractInfo;

    // Sessions indexed by: keccak256(nftContract, rigId) => session
    mapping(bytes32 => MiningSession) public sessions;

    // User's active rigs: user => session keys
    mapping(address => bytes32[]) public userSessionKeys;

    // Global mining stats
    uint256 public totalHashRate;
    uint256 public totalWattConsumed;
    uint256 public totalMinersActive;

    // Reward calculation
    // Rewards are proportional shares of the GamePool for each algorithm
    uint256 public rewardRate = 1e12;  // Base reward rate per effective power per second
    uint256 public constant PRECISION = 1e18;

    // Per-algorithm stats
    mapping(uint8 => uint256) public algoHashRate;
    mapping(uint8 => uint256) public algoMinersCount;

    // ============================================================================
    // Events
    // ============================================================================

    event MiningStarted(
        address indexed nftContract,
        uint256 indexed rigId,
        address indexed owner,
        uint256 wattDeposited,
        uint8 algorithm
    );
    event MiningStopped(
        address indexed nftContract,
        uint256 indexed rigId,
        uint256 earned,
        uint256 wattRefunded
    );
    event RewardsClaimed(
        address indexed nftContract,
        uint256 indexed rigId,
        GamePool.Coin coin,
        uint256 amount
    );
    event WattConsumed(
        address indexed nftContract,
        uint256 indexed rigId,
        uint256 amount
    );
    event WattDeposited(
        address indexed nftContract,
        uint256 indexed rigId,
        uint256 amount
    );
    event NFTContractAdded(address indexed nftContract);
    event NFTContractUpdated(address indexed nftContract, bool enabled);
    event StakingPoolSet(address indexed pool);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    // ============================================================================
    // Constructor
    // ============================================================================

    constructor(
        address _wattToken,
        address _gamePool
    ) Ownable(msg.sender) {
        require(_wattToken != address(0), "Invalid WATT");
        require(_gamePool != address(0), "Invalid GamePool");

        wattToken = IWATT(_wattToken);
        gamePool = GamePool(_gamePool);
    }

    // ============================================================================
    // Modifiers
    // ============================================================================

    modifier validNFTContract(address nftContract) {
        require(nftContractInfo[nftContract].enabled, "NFT contract not enabled");
        _;
    }

    // ============================================================================
    // Session Key Helper
    // ============================================================================

    function _sessionKey(address nftContract, uint256 rigId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(nftContract, rigId));
    }

    // ============================================================================
    // Mining Functions
    // ============================================================================

    /**
     * @dev Start mining with a rig
     * @param nftContract Address of the NFT contract
     * @param rigId Token ID of the rig NFT
     * @param wattAmount Amount of WATT to deposit as fuel
     */
    function startMining(
        address nftContract,
        uint256 rigId,
        uint256 wattAmount
    ) external nonReentrant validNFTContract(nftContract) {
        IMiningRigNFT nft = IMiningRigNFT(nftContract);
        require(nft.ownerOf(rigId) == msg.sender, "Not owner");

        bytes32 key = _sessionKey(nftContract, rigId);
        require(!sessions[key].active, "Already mining");
        require(!nft.isStaked(rigId), "Rig is staked");

        // Get rig traits
        IMiningRigNFT.RigTraits memory traits = nft.rigTraits(rigId);

        // Minimum WATT for 1 hour of operation
        uint256 wattPerHour = uint256(traits.wattConsumption) * 1e18;
        require(wattAmount >= wattPerHour, "Min 1 hour WATT required");

        // Transfer WATT from user
        require(wattToken.transferFrom(msg.sender, address(this), wattAmount), "WATT transfer failed");

        // Transfer NFT to this contract
        nft.transferFrom(msg.sender, address(this), rigId);

        // Mark as mining on the NFT contract
        nft.setMining(rigId, true);

        // Create session
        sessions[key] = MiningSession({
            owner: msg.sender,
            nftContract: nftContract,
            rigId: rigId,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            lastWattCheckTime: block.timestamp,
            wattDeposited: wattAmount,
            wattConsumed: 0,
            totalEarned: 0,
            algorithm: traits.algorithm,
            active: true
        });

        userSessionKeys[msg.sender].push(key);

        // Update global stats
        totalHashRate += traits.hashRate;
        totalMinersActive++;
        algoHashRate[traits.algorithm] += traits.hashRate;
        algoMinersCount[traits.algorithm]++;
        nftContractInfo[nftContract].totalRigsMining++;

        emit MiningStarted(nftContract, rigId, msg.sender, wattAmount, traits.algorithm);
    }

    /**
     * @dev Stop mining and withdraw rig
     */
    function stopMining(address nftContract, uint256 rigId) external nonReentrant {
        bytes32 key = _sessionKey(nftContract, rigId);
        MiningSession storage session = sessions[key];

        require(session.owner == msg.sender, "Not owner");
        require(session.active, "Not mining");

        IMiningRigNFT nft = IMiningRigNFT(nftContract);

        // Claim pending rewards first
        _claimRewards(key);

        // Calculate WATT consumption
        uint256 wattUsed = _calculateWattConsumed(key);
        uint256 wattRefund = session.wattDeposited > wattUsed
            ? session.wattDeposited - wattUsed
            : 0;

        uint256 wattToStaking = wattUsed - session.wattConsumed;  // New consumption since last check

        // Transfer consumed WATT to staking pool
        if (wattToStaking > 0 && stakingPool != address(0)) {
            require(wattToken.transfer(stakingPool, wattToStaking), "WATT transfer failed");
            totalWattConsumed += wattToStaking;

            // Notify staking pool of new rewards
            // Note: StakingPool.notifyReward() should be called
            (bool success,) = stakingPool.call(
                abi.encodeWithSignature("notifyReward(uint256)", wattToStaking)
            );
            // Don't revert if notify fails - just log
            if (success) {
                emit WattConsumed(nftContract, rigId, wattToStaking);
            }
        }

        // Refund unused WATT
        if (wattRefund > 0) {
            require(wattToken.transfer(msg.sender, wattRefund), "Refund failed");
        }

        // Get traits for stats update
        IMiningRigNFT.RigTraits memory traits = nft.rigTraits(rigId);

        // Update global stats
        totalHashRate -= traits.hashRate;
        totalMinersActive--;
        algoHashRate[session.algorithm] -= traits.hashRate;
        algoMinersCount[session.algorithm]--;
        nftContractInfo[nftContract].totalRigsMining--;

        // Return NFT
        nft.setMining(rigId, false);
        nft.transferFrom(address(this), msg.sender, rigId);

        // Clear session
        uint256 totalEarned = session.totalEarned;
        session.active = false;
        _removeFromUserSessions(msg.sender, key);

        emit MiningStopped(nftContract, rigId, totalEarned, wattRefund);
    }

    /**
     * @dev Claim mining rewards without stopping
     */
    function claimRewards(address nftContract, uint256 rigId) external nonReentrant {
        bytes32 key = _sessionKey(nftContract, rigId);
        require(sessions[key].owner == msg.sender, "Not owner");
        require(sessions[key].active, "Not mining");

        _claimRewards(key);
    }

    /**
     * @dev Deposit more WATT to extend mining time
     */
    function depositWatt(address nftContract, uint256 rigId, uint256 amount) external nonReentrant {
        bytes32 key = _sessionKey(nftContract, rigId);
        MiningSession storage session = sessions[key];

        require(session.owner == msg.sender, "Not owner");
        require(session.active, "Not mining");
        require(amount > 0, "Zero amount");

        require(wattToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        session.wattDeposited += amount;

        emit WattDeposited(nftContract, rigId, amount);
    }

    // ============================================================================
    // Internal Functions
    // ============================================================================

    function _claimRewards(bytes32 key) internal {
        MiningSession storage session = sessions[key];

        // First, process WATT consumption
        _processWattConsumption(key);

        // Get rig's algorithm and corresponding coin
        GamePool.Coin coin = gamePool.getCoinForAlgorithm(session.algorithm);

        // Calculate pending rewards
        uint256 pending = _calculatePendingRewards(key);

        if (pending > 0) {
            session.totalEarned += pending;
            session.lastClaimTime = block.timestamp;

            // Authorize withdrawal from GamePool
            gamePool.authorizeWithdrawal(session.owner, coin, pending);

            emit RewardsClaimed(session.nftContract, session.rigId, coin, pending);
        }
    }

    function _processWattConsumption(bytes32 key) internal {
        MiningSession storage session = sessions[key];

        uint256 wattUsed = _calculateWattConsumed(key);
        uint256 newConsumption = wattUsed - session.wattConsumed;

        if (newConsumption > 0 && stakingPool != address(0)) {
            session.wattConsumed = wattUsed;
            session.lastWattCheckTime = block.timestamp;

            // Transfer to staking pool
            require(wattToken.transfer(stakingPool, newConsumption), "WATT transfer failed");
            totalWattConsumed += newConsumption;

            // Notify staking pool
            (bool success,) = stakingPool.call(
                abi.encodeWithSignature("notifyReward(uint256)", newConsumption)
            );
            if (success) {
                emit WattConsumed(session.nftContract, session.rigId, newConsumption);
            }
        }
    }

    function _calculatePendingRewards(bytes32 key) internal view returns (uint256) {
        MiningSession memory session = sessions[key];
        if (!session.active) return 0;

        // Get NFT contract and traits
        IMiningRigNFT nft = IMiningRigNFT(session.nftContract);
        uint256 effectivePower = nft.getEffectivePower(session.rigId);

        uint256 duration = block.timestamp - session.lastClaimTime;

        // rewards = effectivePower * duration * rewardRate / totalAlgoHashRate
        uint256 algoHash = algoHashRate[session.algorithm];
        if (algoHash == 0) return 0;

        return (effectivePower * duration * rewardRate) / algoHash;
    }

    function _calculateWattConsumed(bytes32 key) internal view returns (uint256) {
        MiningSession memory session = sessions[key];

        IMiningRigNFT nft = IMiningRigNFT(session.nftContract);
        uint256 wattPerHour = nft.getWattPerHour(session.rigId);

        uint256 duration = block.timestamp - session.startTime;

        // WATT consumed = duration (seconds) * wattPerHour / 3600
        uint256 consumed = (duration * wattPerHour) / 3600;

        // Cap at deposited amount
        return consumed > session.wattDeposited ? session.wattDeposited : consumed;
    }

    function _removeFromUserSessions(address user, bytes32 key) internal {
        bytes32[] storage keys = userSessionKeys[user];
        for (uint256 i = 0; i < keys.length; i++) {
            if (keys[i] == key) {
                keys[i] = keys[keys.length - 1];
                keys.pop();
                break;
            }
        }
    }

    // ============================================================================
    // View Functions
    // ============================================================================

    function getSession(address nftContract, uint256 rigId)
        external view returns (MiningSession memory)
    {
        return sessions[_sessionKey(nftContract, rigId)];
    }

    function getPendingRewards(address nftContract, uint256 rigId)
        external view returns (uint256)
    {
        return _calculatePendingRewards(_sessionKey(nftContract, rigId));
    }

    function getRemainingWatt(address nftContract, uint256 rigId)
        external view returns (uint256)
    {
        bytes32 key = _sessionKey(nftContract, rigId);
        MiningSession memory session = sessions[key];

        uint256 consumed = _calculateWattConsumed(key);
        return session.wattDeposited > consumed ? session.wattDeposited - consumed : 0;
    }

    function getEstimatedRuntime(address nftContract, uint256 rigId)
        external view returns (uint256)
    {
        bytes32 key = _sessionKey(nftContract, rigId);
        MiningSession memory session = sessions[key];

        uint256 remaining = session.wattDeposited > _calculateWattConsumed(key)
            ? session.wattDeposited - _calculateWattConsumed(key)
            : 0;

        IMiningRigNFT nft = IMiningRigNFT(session.nftContract);
        uint256 wattPerHour = nft.getWattPerHour(rigId);

        return (remaining * 3600) / wattPerHour; // Returns seconds
    }

    function getUserSessions(address user)
        external view returns (bytes32[] memory)
    {
        return userSessionKeys[user];
    }

    function getUserActiveRigs(address user)
        external view returns (address[] memory nftContracts_, uint256[] memory rigIds)
    {
        bytes32[] memory keys = userSessionKeys[user];
        uint256 activeCount = 0;

        // Count active sessions
        for (uint256 i = 0; i < keys.length; i++) {
            if (sessions[keys[i]].active) activeCount++;
        }

        nftContracts_ = new address[](activeCount);
        rigIds = new uint256[](activeCount);

        uint256 j = 0;
        for (uint256 i = 0; i < keys.length; i++) {
            if (sessions[keys[i]].active) {
                nftContracts_[j] = sessions[keys[i]].nftContract;
                rigIds[j] = sessions[keys[i]].rigId;
                j++;
            }
        }
    }

    function getNFTContracts() external view returns (address[] memory) {
        return nftContracts;
    }

    function getAlgoStats(uint8 algo) external view returns (uint256 hashRate, uint256 minerCount) {
        return (algoHashRate[algo], algoMinersCount[algo]);
    }

    // ============================================================================
    // Admin Functions
    // ============================================================================

    /**
     * @dev Add a new NFT contract for mining rigs
     * Use this when new NFT rig models are released
     */
    function addNFTContract(address nftContract) external onlyOwner {
        require(nftContract != address(0), "Invalid address");
        require(!nftContractInfo[nftContract].enabled, "Already added");

        nftContracts.push(nftContract);
        nftContractInfo[nftContract] = NFTContractInfo({
            enabled: true,
            totalRigsMining: 0,
            addedAt: block.timestamp
        });

        emit NFTContractAdded(nftContract);
    }

    /**
     * @dev Enable or disable an NFT contract
     */
    function setNFTContractEnabled(address nftContract, bool enabled) external onlyOwner {
        require(nftContractInfo[nftContract].addedAt > 0, "Contract not added");
        nftContractInfo[nftContract].enabled = enabled;
        emit NFTContractUpdated(nftContract, enabled);
    }

    /**
     * @dev Set the staking pool address
     */
    function setStakingPool(address pool) external onlyOwner {
        require(pool != address(0), "Invalid address");
        stakingPool = pool;
        emit StakingPoolSet(pool);
    }

    /**
     * @dev Update reward rate
     */
    function setRewardRate(uint256 newRate) external onlyOwner {
        emit RewardRateUpdated(rewardRate, newRate);
        rewardRate = newRate;
    }

    /**
     * @dev Emergency: return stuck NFT (if session was corrupted)
     */
    function emergencyReturnNFT(
        address nftContract,
        uint256 rigId,
        address to
    ) external onlyOwner {
        bytes32 key = _sessionKey(nftContract, rigId);
        require(!sessions[key].active, "Session still active");

        IMiningRigNFT nft = IMiningRigNFT(nftContract);
        nft.setMining(rigId, false);
        nft.transferFrom(address(this), to, rigId);
    }

    /**
     * @dev Emergency: recover stuck WATT tokens
     */
    function emergencyRecoverWATT(uint256 amount, address to) external onlyOwner {
        require(wattToken.transfer(to, amount), "Transfer failed");
    }
}
