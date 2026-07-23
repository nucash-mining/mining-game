// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMiningEngine
 * @dev Interface for the MiningEngine contract - Virtual mining logic
 */
interface IMiningEngine {
    /// @notice Mining session data
    struct MiningSession {
        address owner;
        uint256 rigId;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 wattDeposited;
        uint256 totalEarned;
        bool active;
    }

    /// @notice Start mining with a rig
    /// @param rigId Token ID of the rig NFT
    /// @param wattAmount Amount of WATT to deposit as fuel
    function startMining(uint256 rigId, uint256 wattAmount) external;

    /// @notice Stop mining and withdraw rig
    /// @param rigId Token ID of the rig
    function stopMining(uint256 rigId) external;

    /// @notice Claim mining rewards without stopping
    /// @param rigId Token ID of the rig
    function claimRewards(uint256 rigId) external;

    /// @notice Deposit more WATT to extend mining time
    /// @param rigId Token ID of the rig
    /// @param amount Amount of WATT to add
    function depositWatt(uint256 rigId, uint256 amount) external;

    /// @notice Get session data for a rig
    function sessions(uint256 rigId) external view returns (MiningSession memory);

    /// @notice Get pending rewards for a rig
    function getPendingRewards(uint256 rigId) external view returns (uint256);

    /// @notice Get remaining WATT fuel for a rig
    function getRemainingWatt(uint256 rigId) external view returns (uint256);

    /// @notice Get estimated runtime in seconds
    function getEstimatedRuntime(uint256 rigId) external view returns (uint256);

    /// @notice Get all active rig IDs for a user
    function getUserRigs(address user) external view returns (uint256[] memory);

    /// @notice Total hashrate from all active miners
    function totalHashRate() external view returns (uint256);

    /// @notice Reward rate per effective hash power per second
    function rewardRate() external view returns (uint256);

    // Events
    event MiningStarted(uint256 indexed rigId, address indexed owner, uint256 wattDeposited);
    event MiningStopped(uint256 indexed rigId, uint256 earned, uint256 wattRefunded);
    event RewardsClaimed(uint256 indexed rigId, uint256 amount);
    event WattConsumed(uint256 indexed rigId, uint256 amount);
    event WattDeposited(uint256 indexed rigId, uint256 amount);
}
