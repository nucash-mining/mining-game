// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "../interfaces/IWATT.sol";
import "../interfaces/IMiningRigNFT.sol";
import "../libraries/TraitCalculator.sol";

/**
 * @title StakingPool
 * @dev Staking pool for idle mining rig NFTs
 *
 * Key mechanics:
 * - Idle NFTs (not actively mining) can be staked here
 * - Stakers earn from WATT consumed by active miners in MiningEngine
 * - Rewards proportional to stake weight (based on NFT traits)
 * - Higher rarity = higher stake weight = more rewards
 *
 * SUPPORTS MULTIPLE NFT CONTRACTS:
 * - Owner can add new NFT contract addresses as new rig models are released
 * - Each NFT contract must implement the IMiningRigNFT interface
 */
contract StakingPool is Ownable, ReentrancyGuard, ERC721Holder {
    using TraitCalculator for *;

    // ============================================================================
    // Structs
    // ============================================================================

    struct Stake {
        address owner;
        address nftContract;
        uint256 rigId;
        uint256 weight;
        uint256 startTime;
        uint256 rewardDebt;      // Reward debt for accurate accounting
        uint256 totalClaimed;
    }

    struct NFTContractInfo {
        bool enabled;
        uint256 totalStaked;
        uint256 addedAt;
    }

    // ============================================================================
    // State Variables
    // ============================================================================

    // Core token
    IWATT public immutable wattToken;

    // MiningEngine that sends consumed WATT
    address public miningEngine;

    // Supported NFT contracts
    address[] public nftContracts;
    mapping(address => NFTContractInfo) public nftContractInfo;

    // Stakes indexed by: keccak256(nftContract, rigId) => stake
    mapping(bytes32 => Stake) public stakes;

    // User's staked rigs: user => stake keys
    mapping(address => bytes32[]) public userStakeKeys;

    // Reward tracking (using rewardPerToken model for gas efficiency)
    uint256 public totalStakeWeight;
    uint256 public accWattPerShare;          // Accumulated WATT per share (scaled by 1e18)
    uint256 public lastRewardBalance;        // Last recorded WATT balance
    uint256 public totalWattDistributed;

    // Precision for calculations
    uint256 public constant PRECISION = 1e18;

    // ============================================================================
    // Events
    // ============================================================================

    event Staked(
        address indexed nftContract,
        uint256 indexed rigId,
        address indexed owner,
        uint256 weight
    );
    event Unstaked(
        address indexed nftContract,
        uint256 indexed rigId,
        address indexed owner,
        uint256 claimed
    );
    event RewardsClaimed(
        address indexed nftContract,
        uint256 indexed rigId,
        uint256 amount
    );
    event WattReceived(uint256 amount, uint256 newAccPerShare);
    event NFTContractAdded(address indexed nftContract);
    event NFTContractUpdated(address indexed nftContract, bool enabled);
    event MiningEngineSet(address indexed engine);

    // ============================================================================
    // Constructor
    // ============================================================================

    constructor(address _wattToken) Ownable(msg.sender) {
        require(_wattToken != address(0), "Invalid WATT");
        wattToken = IWATT(_wattToken);
    }

    // ============================================================================
    // Modifiers
    // ============================================================================

    modifier validNFTContract(address nftContract) {
        require(nftContractInfo[nftContract].enabled, "NFT contract not enabled");
        _;
    }

    modifier onlyMiningEngine() {
        require(msg.sender == miningEngine, "Only MiningEngine");
        _;
    }

    // ============================================================================
    // Stake Key Helper
    // ============================================================================

    function _stakeKey(address nftContract, uint256 rigId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(nftContract, rigId));
    }

    // ============================================================================
    // Staking Functions
    // ============================================================================

    /**
     * @dev Stake an idle rig to earn from consumed WATT
     * @param nftContract Address of the NFT contract
     * @param rigId Token ID of the rig NFT
     */
    function stake(address nftContract, uint256 rigId)
        external nonReentrant validNFTContract(nftContract)
    {
        IMiningRigNFT nft = IMiningRigNFT(nftContract);
        require(nft.ownerOf(rigId) == msg.sender, "Not owner");
        require(!nft.isMining(rigId), "Rig is mining");

        bytes32 key = _stakeKey(nftContract, rigId);
        require(stakes[key].owner == address(0), "Already staked");

        // Update pool first
        _updatePool();

        // Calculate stake weight
        IMiningRigNFT.RigTraits memory traits = nft.rigTraits(rigId);
        uint256 weight = TraitCalculator.calculateStakeWeight(
            traits.hashRate,
            traits.efficiency,
            traits.rarity
        );

        // Transfer NFT to pool
        nft.transferFrom(msg.sender, address(this), rigId);
        nft.setStaked(rigId, true);

        // Create stake
        stakes[key] = Stake({
            owner: msg.sender,
            nftContract: nftContract,
            rigId: rigId,
            weight: weight,
            startTime: block.timestamp,
            rewardDebt: (weight * accWattPerShare) / PRECISION,
            totalClaimed: 0
        });

        userStakeKeys[msg.sender].push(key);
        totalStakeWeight += weight;
        nftContractInfo[nftContract].totalStaked++;

        emit Staked(nftContract, rigId, msg.sender, weight);
    }

    /**
     * @dev Unstake and claim rewards
     */
    function unstake(address nftContract, uint256 rigId) external nonReentrant {
        bytes32 key = _stakeKey(nftContract, rigId);
        Stake storage stk = stakes[key];
        require(stk.owner == msg.sender, "Not owner");

        // Update pool
        _updatePool();

        // Calculate pending rewards
        uint256 pending = _calculatePending(key);
        uint256 totalClaimed = stk.totalClaimed;

        if (pending > 0) {
            require(wattToken.transfer(msg.sender, pending), "Transfer failed");
            totalClaimed += pending;
            totalWattDistributed += pending;
        }

        uint256 weight = stk.weight;
        totalStakeWeight -= weight;
        nftContractInfo[nftContract].totalStaked--;

        // Return NFT
        IMiningRigNFT nft = IMiningRigNFT(nftContract);
        nft.setStaked(rigId, false);
        nft.transferFrom(address(this), msg.sender, rigId);

        // Clean up
        _removeFromUserStakes(msg.sender, key);
        delete stakes[key];

        emit Unstaked(nftContract, rigId, msg.sender, totalClaimed);
    }

    /**
     * @dev Claim rewards without unstaking
     */
    function claimRewards(address nftContract, uint256 rigId) external nonReentrant {
        bytes32 key = _stakeKey(nftContract, rigId);
        Stake storage stk = stakes[key];
        require(stk.owner == msg.sender, "Not owner");

        // Update pool
        _updatePool();

        uint256 pending = _calculatePending(key);
        require(pending > 0, "No rewards");

        // Update reward debt
        stk.rewardDebt = (stk.weight * accWattPerShare) / PRECISION;
        stk.totalClaimed += pending;
        totalWattDistributed += pending;

        require(wattToken.transfer(msg.sender, pending), "Transfer failed");

        emit RewardsClaimed(nftContract, rigId, pending);
    }

    /**
     * @dev Claim rewards for all staked rigs
     */
    function claimAllRewards() external nonReentrant {
        bytes32[] storage keys = userStakeKeys[msg.sender];
        require(keys.length > 0, "No stakes");

        _updatePool();

        uint256 totalPending = 0;

        for (uint256 i = 0; i < keys.length; i++) {
            Stake storage stk = stakes[keys[i]];
            uint256 pending = _calculatePending(keys[i]);

            if (pending > 0) {
                stk.rewardDebt = (stk.weight * accWattPerShare) / PRECISION;
                stk.totalClaimed += pending;
                totalPending += pending;

                emit RewardsClaimed(stk.nftContract, stk.rigId, pending);
            }
        }

        require(totalPending > 0, "No rewards");
        totalWattDistributed += totalPending;
        require(wattToken.transfer(msg.sender, totalPending), "Transfer failed");
    }

    // ============================================================================
    // Reward Notification (from MiningEngine)
    // ============================================================================

    /**
     * @dev Called by MiningEngine when WATT is consumed during mining
     * The WATT has already been transferred to this contract
     * @param amount Amount of WATT added to the reward pool
     */
    function notifyReward(uint256 amount) external onlyMiningEngine {
        _updatePool();
        emit WattReceived(amount, accWattPerShare);
    }

    // ============================================================================
    // Internal Functions
    // ============================================================================

    function _updatePool() internal {
        if (totalStakeWeight == 0) {
            lastRewardBalance = wattToken.balanceOf(address(this));
            return;
        }

        uint256 currentBalance = wattToken.balanceOf(address(this));
        uint256 newRewards = currentBalance > lastRewardBalance
            ? currentBalance - lastRewardBalance
            : 0;

        if (newRewards > 0) {
            accWattPerShare += (newRewards * PRECISION) / totalStakeWeight;
        }

        lastRewardBalance = currentBalance;
    }

    function _calculatePending(bytes32 key) internal view returns (uint256) {
        Stake memory stk = stakes[key];
        if (stk.owner == address(0)) return 0;

        uint256 accumulated = (stk.weight * accWattPerShare) / PRECISION;
        return accumulated > stk.rewardDebt ? accumulated - stk.rewardDebt : 0;
    }

    function _removeFromUserStakes(address user, bytes32 key) internal {
        bytes32[] storage keys = userStakeKeys[user];
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

    function getStake(address nftContract, uint256 rigId)
        external view returns (Stake memory)
    {
        return stakes[_stakeKey(nftContract, rigId)];
    }

    function getPendingRewards(address nftContract, uint256 rigId)
        external view returns (uint256)
    {
        bytes32 key = _stakeKey(nftContract, rigId);
        Stake memory stk = stakes[key];
        if (stk.owner == address(0)) return 0;

        // Calculate with potential new rewards
        uint256 currentBalance = wattToken.balanceOf(address(this));
        uint256 newRewards = currentBalance > lastRewardBalance
            ? currentBalance - lastRewardBalance
            : 0;

        uint256 updatedAccPerShare = accWattPerShare;
        if (totalStakeWeight > 0 && newRewards > 0) {
            updatedAccPerShare += (newRewards * PRECISION) / totalStakeWeight;
        }

        uint256 accumulated = (stk.weight * updatedAccPerShare) / PRECISION;
        return accumulated > stk.rewardDebt ? accumulated - stk.rewardDebt : 0;
    }

    function getAllPendingRewards(address user) external view returns (uint256 total) {
        bytes32[] memory keys = userStakeKeys[user];

        // Calculate updated accPerShare
        uint256 currentBalance = wattToken.balanceOf(address(this));
        uint256 newRewards = currentBalance > lastRewardBalance
            ? currentBalance - lastRewardBalance
            : 0;

        uint256 updatedAccPerShare = accWattPerShare;
        if (totalStakeWeight > 0 && newRewards > 0) {
            updatedAccPerShare += (newRewards * PRECISION) / totalStakeWeight;
        }

        for (uint256 i = 0; i < keys.length; i++) {
            Stake memory stk = stakes[keys[i]];
            uint256 accumulated = (stk.weight * updatedAccPerShare) / PRECISION;
            if (accumulated > stk.rewardDebt) {
                total += accumulated - stk.rewardDebt;
            }
        }
    }

    function getStakeWeight(address nftContract, uint256 rigId)
        external view returns (uint256)
    {
        return stakes[_stakeKey(nftContract, rigId)].weight;
    }

    function getUserStakes(address user)
        external view returns (bytes32[] memory)
    {
        return userStakeKeys[user];
    }

    function getUserStakedRigs(address user)
        external view returns (address[] memory nftContracts_, uint256[] memory rigIds)
    {
        bytes32[] memory keys = userStakeKeys[user];

        nftContracts_ = new address[](keys.length);
        rigIds = new uint256[](keys.length);

        for (uint256 i = 0; i < keys.length; i++) {
            Stake memory stk = stakes[keys[i]];
            nftContracts_[i] = stk.nftContract;
            rigIds[i] = stk.rigId;
        }
    }

    function getNFTContracts() external view returns (address[] memory) {
        return nftContracts;
    }

    function getPoolStats() external view returns (
        uint256 _totalStakeWeight,
        uint256 _totalDistributed,
        uint256 _pendingDistribution,
        uint256 _accWattPerShare
    ) {
        uint256 currentBalance = wattToken.balanceOf(address(this));
        uint256 pending = currentBalance > lastRewardBalance
            ? currentBalance - lastRewardBalance
            : 0;

        return (
            totalStakeWeight,
            totalWattDistributed,
            pending,
            accWattPerShare
        );
    }

    // ============================================================================
    // Admin Functions
    // ============================================================================

    /**
     * @dev Add a new NFT contract for staking
     */
    function addNFTContract(address nftContract) external onlyOwner {
        require(nftContract != address(0), "Invalid address");
        require(!nftContractInfo[nftContract].enabled, "Already added");

        nftContracts.push(nftContract);
        nftContractInfo[nftContract] = NFTContractInfo({
            enabled: true,
            totalStaked: 0,
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
     * @dev Set the MiningEngine address
     */
    function setMiningEngine(address engine) external onlyOwner {
        require(engine != address(0), "Invalid address");
        miningEngine = engine;
        emit MiningEngineSet(engine);
    }

    /**
     * @dev Emergency: return stuck NFT
     */
    function emergencyReturnNFT(
        address nftContract,
        uint256 rigId,
        address to
    ) external onlyOwner {
        bytes32 key = _stakeKey(nftContract, rigId);
        require(stakes[key].owner == address(0), "Stake still active");

        IMiningRigNFT nft = IMiningRigNFT(nftContract);
        nft.setStaked(rigId, false);
        nft.transferFrom(address(this), to, rigId);
    }

    /**
     * @dev Emergency: recover stuck WATT tokens
     * Only recovers excess beyond what's owed to stakers
     */
    function emergencyRecoverWATT(uint256 amount, address to) external onlyOwner {
        // Don't allow recovering rewards that belong to stakers
        uint256 currentBalance = wattToken.balanceOf(address(this));
        require(amount <= currentBalance, "Insufficient balance");
        require(wattToken.transfer(to, amount), "Transfer failed");
    }
}
