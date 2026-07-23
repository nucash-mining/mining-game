// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStakingPool
 * @dev Interface for StakingPool contract - Idle NFT staking for WATT rewards
 */
interface IStakingPool {
    /// @notice Stake data
    struct Stake {
        address owner;
        uint256 rigId;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 totalClaimed;
    }

    /// @notice Stake an idle rig to earn from consumed WATT
    /// @param rigId Token ID of the rig NFT
    function stake(uint256 rigId) external;

    /// @notice Unstake and claim rewards
    /// @param rigId Token ID of the rig
    function unstake(uint256 rigId) external;

    /// @notice Claim rewards without unstaking
    /// @param rigId Token ID of the rig
    function claimRewards(uint256 rigId) external;

    /// @notice Called by MiningEngine when WATT is consumed
    /// @param amount Amount of WATT added to reward pool
    function notifyReward(uint256 amount) external;

    /// @notice Get stake data for a rig
    function stakes(uint256 rigId) external view returns (Stake memory);

    /// @notice Get pending rewards for a staked rig
    function getPendingRewards(uint256 rigId) external view returns (uint256);

    /// @notice Get stake weight for a rig
    function getStakeWeight(uint256 rigId) external view returns (uint256);

    /// @notice Get all staked rig IDs for a user
    function getUserStakes(address user) external view returns (uint256[] memory);

    /// @notice Total stake weight from all stakers
    function totalStakeWeight() external view returns (uint256);

    /// @notice Accumulated WATT per share (scaled)
    function accWattPerShare() external view returns (uint256);

    // Events
    event Staked(uint256 indexed rigId, address indexed owner, uint256 weight);
    event Unstaked(uint256 indexed rigId, address indexed owner, uint256 claimed);
    event RewardsClaimed(uint256 indexed rigId, uint256 amount);
    event WattReceived(uint256 amount);
}
