// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGamePool
 * @dev Interface for GamePool contract - Multi-coin fee tracker
 *
 * The GamePool tracks 1% pool fees held in native coins (BTC, LTC, XMR, etc.)
 * Actual coins are held in pool wallets off-chain.
 * This contract tracks balances and authorizes withdrawals.
 */
interface IGamePool {
    /// @notice Supported coins (off-chain)
    enum Coin { BTC, LTC, XMR, ETC, KAS, DASH, ALT }

    /// @notice Report a deposit from the pool server (operator only)
    /// @param coin The coin type deposited
    /// @param amount Amount in smallest unit (satoshis, etc.)
    function reportDeposit(Coin coin, uint256 amount) external;

    /// @notice Authorize withdrawal for a miner (MiningEngine only)
    /// @param miner Address of the miner
    /// @param coin Coin type to withdraw
    /// @param amount Amount to authorize
    function authorizeWithdrawal(address miner, Coin coin, uint256 amount) external;

    /// @notice Confirm off-chain payout was sent (operator only)
    /// @param miner Address of the miner
    /// @param coin Coin type withdrawn
    /// @param amount Amount withdrawn
    /// @param txid Transaction ID on the parent chain
    function confirmWithdrawal(address miner, Coin coin, uint256 amount, string calldata txid) external;

    /// @notice Get balance for a specific coin
    function getCoinBalance(Coin coin) external view returns (uint256);

    /// @notice Get epoch deposits for a coin
    function getEpochDeposits(uint256 epoch, Coin coin) external view returns (uint256);

    /// @notice Get pending withdrawal for a miner
    function getPendingWithdrawal(address miner, Coin coin) external view returns (uint256);

    /// @notice Get coin type for a specific algorithm
    function getCoinForAlgorithm(uint8 algo) external view returns (Coin);

    /// @notice Get current epoch number
    function currentEpoch() external view returns (uint256);

    /// @notice Get epoch duration in seconds
    function epochDuration() external view returns (uint256);

    // Events
    event CoinDeposited(Coin indexed coin, uint256 amount, uint256 epoch);
    event WithdrawalAuthorized(address indexed miner, Coin indexed coin, uint256 amount);
    event WithdrawalProcessed(address indexed miner, Coin indexed coin, uint256 amount, string txid);
}
