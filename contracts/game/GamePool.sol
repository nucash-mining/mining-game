// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GamePool
 * @dev Multi-coin fee tracker for the mining game
 *
 * IMPORTANT: Actual coins (BTC, LTC, XMR, etc.) are held in pool wallets OFF-CHAIN.
 * This contract only TRACKS balances and AUTHORIZES withdrawals.
 *
 * Flow:
 * 1. Pool server reports 1% fee deposits via reportDeposit()
 * 2. MiningEngine authorizes withdrawals based on NFT mining earnings
 * 3. Pool server confirms off-chain payouts via confirmWithdrawal()
 */
contract GamePool is Ownable, ReentrancyGuard {
    // ============================================================================
    // Enums & Structs
    // ============================================================================

    /// @notice Supported coins (held off-chain in pool wallets)
    enum Coin { BTC, LTC, XMR, ETC, KAS, DASH, ALT }

    /// @notice Epoch statistics
    struct EpochStats {
        uint256 startTime;
        mapping(Coin => uint256) deposits;
        mapping(Coin => uint256) distributions;
        bool finalized;
    }

    // ============================================================================
    // State Variables
    // ============================================================================

    // Algorithm to Coin mapping (matches ParentChainAlgo enum from C++ code)
    // SHA256D=0->BTC, SCRYPT=1->LTC, ETHASH=2->ETC, RANDOMX=3->XMR, EQUIHASH=4->ALT, X11=5->DASH, KHEAVYHASH=6->KAS
    mapping(uint8 => Coin) public algorithmToCoin;

    // Coin balances (tracked, actual coins held in pool wallets)
    mapping(Coin => uint256) public coinBalances;

    // Epoch tracking
    uint256 public currentEpoch;
    uint256 public epochDuration = 1 days;
    uint256 public lastEpochTime;
    mapping(uint256 => EpochStats) private epochStats;

    // Miner -> Coin -> Pending balance (authorized for withdrawal)
    mapping(address => mapping(Coin => uint256)) public pendingWithdrawals;

    // Miner -> Coin -> Total claimed all time
    mapping(address => mapping(Coin => uint256)) public totalClaimed;

    // Withdrawal tracking
    struct WithdrawalRecord {
        address miner;
        Coin coin;
        uint256 amount;
        string txid;
        uint256 timestamp;
    }
    WithdrawalRecord[] public withdrawalHistory;

    // Access control
    mapping(address => bool) public operators;
    address public miningEngine;

    // Total statistics
    mapping(Coin => uint256) public totalDeposited;
    mapping(Coin => uint256) public totalDistributed;

    // ============================================================================
    // Events
    // ============================================================================

    event CoinDeposited(Coin indexed coin, uint256 amount, uint256 indexed epoch);
    event WithdrawalAuthorized(address indexed miner, Coin indexed coin, uint256 amount);
    event WithdrawalProcessed(address indexed miner, Coin indexed coin, uint256 amount, string txid);
    event EpochAdvanced(uint256 indexed oldEpoch, uint256 indexed newEpoch);
    event OperatorUpdated(address indexed operator, bool authorized);
    event MiningEngineSet(address indexed engine);
    event AlgorithmCoinMappingUpdated(uint8 algorithm, Coin coin);

    // ============================================================================
    // Constructor
    // ============================================================================

    constructor() Ownable(msg.sender) {
        lastEpochTime = block.timestamp;

        // Initialize algorithm to coin mapping
        // These match the ParentChainAlgo enum in parent_chain.h:
        // RANDOMX=0 (Monero), SHA256D=1 (Bitcoin), SCRYPT=2 (Litecoin), etc.
        // But the NFT uses: SHA256D=0, Scrypt=1, Ethash=2, RandomX=3, Equihash=4, X11=5, kHeavyHash=6
        algorithmToCoin[0] = Coin.BTC;   // SHA256D -> Bitcoin
        algorithmToCoin[1] = Coin.LTC;   // Scrypt -> Litecoin
        algorithmToCoin[2] = Coin.ETC;   // Ethash -> Ethereum Classic
        algorithmToCoin[3] = Coin.XMR;   // RandomX -> Monero
        algorithmToCoin[4] = Coin.ALT;   // Equihash -> Altcoinchain
        algorithmToCoin[5] = Coin.DASH;  // X11 -> Dash
        algorithmToCoin[6] = Coin.KAS;   // kHeavyHash -> Kaspa

        // Owner is initial operator
        operators[msg.sender] = true;
        emit OperatorUpdated(msg.sender, true);
    }

    // ============================================================================
    // Modifiers
    // ============================================================================

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "Not operator");
        _;
    }

    modifier onlyMiningEngine() {
        require(msg.sender == miningEngine, "Only MiningEngine");
        _;
    }

    // ============================================================================
    // Deposit Functions (Pool Server)
    // ============================================================================

    /**
     * @dev Pool server reports 1% fee deposits (actual coins held in pool wallet)
     * @param coin The coin type deposited
     * @param amount Amount in smallest unit (satoshis, gwei, etc.)
     */
    function reportDeposit(Coin coin, uint256 amount) external onlyOperator {
        require(amount > 0, "Zero amount");

        _advanceEpochIfNeeded();

        coinBalances[coin] += amount;
        totalDeposited[coin] += amount;

        // Track in current epoch
        epochStats[currentEpoch].deposits[coin] += amount;

        emit CoinDeposited(coin, amount, currentEpoch);
    }

    /**
     * @dev Batch deposit multiple coins
     */
    function reportDeposits(Coin[] calldata coins, uint256[] calldata amounts) external onlyOperator {
        require(coins.length == amounts.length, "Length mismatch");

        _advanceEpochIfNeeded();

        for (uint256 i = 0; i < coins.length; i++) {
            if (amounts[i] > 0) {
                coinBalances[coins[i]] += amounts[i];
                totalDeposited[coins[i]] += amounts[i];
                epochStats[currentEpoch].deposits[coins[i]] += amounts[i];
                emit CoinDeposited(coins[i], amounts[i], currentEpoch);
            }
        }
    }

    // ============================================================================
    // Withdrawal Authorization (MiningEngine)
    // ============================================================================

    /**
     * @dev MiningEngine authorizes withdrawal for a miner based on their NFT mining earnings
     * @param miner Address of the miner
     * @param coin Coin type to withdraw
     * @param amount Amount to authorize (in smallest units)
     */
    function authorizeWithdrawal(
        address miner,
        Coin coin,
        uint256 amount
    ) external onlyMiningEngine nonReentrant {
        require(miner != address(0), "Invalid miner");
        require(amount > 0, "Zero amount");
        require(coinBalances[coin] >= amount, "Insufficient pool balance");

        coinBalances[coin] -= amount;
        pendingWithdrawals[miner][coin] += amount;

        // Track distribution
        totalDistributed[coin] += amount;
        epochStats[currentEpoch].distributions[coin] += amount;

        emit WithdrawalAuthorized(miner, coin, amount);
    }

    // ============================================================================
    // Withdrawal Confirmation (Pool Server)
    // ============================================================================

    /**
     * @dev Pool server confirms off-chain payout was sent
     * @param miner Address of the miner
     * @param coin Coin type withdrawn
     * @param amount Amount withdrawn
     * @param txid Transaction ID on the parent chain
     */
    function confirmWithdrawal(
        address miner,
        Coin coin,
        uint256 amount,
        string calldata txid
    ) external onlyOperator {
        require(pendingWithdrawals[miner][coin] >= amount, "Invalid amount");
        require(bytes(txid).length > 0, "Empty txid");

        pendingWithdrawals[miner][coin] -= amount;
        totalClaimed[miner][coin] += amount;

        // Record withdrawal
        withdrawalHistory.push(WithdrawalRecord({
            miner: miner,
            coin: coin,
            amount: amount,
            txid: txid,
            timestamp: block.timestamp
        }));

        emit WithdrawalProcessed(miner, coin, amount, txid);
    }

    // ============================================================================
    // Epoch Management
    // ============================================================================

    function _advanceEpochIfNeeded() internal {
        if (block.timestamp >= lastEpochTime + epochDuration) {
            uint256 oldEpoch = currentEpoch;

            // Finalize current epoch
            epochStats[currentEpoch].finalized = true;

            // Advance epoch
            currentEpoch++;
            lastEpochTime = block.timestamp;
            epochStats[currentEpoch].startTime = block.timestamp;

            emit EpochAdvanced(oldEpoch, currentEpoch);
        }
    }

    /**
     * @dev Force advance to next epoch (owner only, for emergency)
     */
    function forceAdvanceEpoch() external onlyOwner {
        uint256 oldEpoch = currentEpoch;
        epochStats[currentEpoch].finalized = true;
        currentEpoch++;
        lastEpochTime = block.timestamp;
        epochStats[currentEpoch].startTime = block.timestamp;
        emit EpochAdvanced(oldEpoch, currentEpoch);
    }

    // ============================================================================
    // View Functions
    // ============================================================================

    function getCoinBalance(Coin coin) external view returns (uint256) {
        return coinBalances[coin];
    }

    function getAllCoinBalances() external view returns (uint256[7] memory) {
        return [
            coinBalances[Coin.BTC],
            coinBalances[Coin.LTC],
            coinBalances[Coin.XMR],
            coinBalances[Coin.ETC],
            coinBalances[Coin.KAS],
            coinBalances[Coin.DASH],
            coinBalances[Coin.ALT]
        ];
    }

    function getEpochDeposits(uint256 epoch, Coin coin) external view returns (uint256) {
        return epochStats[epoch].deposits[coin];
    }

    function getEpochDistributions(uint256 epoch, Coin coin) external view returns (uint256) {
        return epochStats[epoch].distributions[coin];
    }

    function getPendingWithdrawal(address miner, Coin coin) external view returns (uint256) {
        return pendingWithdrawals[miner][coin];
    }

    function getAllPendingWithdrawals(address miner) external view returns (uint256[7] memory) {
        return [
            pendingWithdrawals[miner][Coin.BTC],
            pendingWithdrawals[miner][Coin.LTC],
            pendingWithdrawals[miner][Coin.XMR],
            pendingWithdrawals[miner][Coin.ETC],
            pendingWithdrawals[miner][Coin.KAS],
            pendingWithdrawals[miner][Coin.DASH],
            pendingWithdrawals[miner][Coin.ALT]
        ];
    }

    function getCoinForAlgorithm(uint8 algo) external view returns (Coin) {
        return algorithmToCoin[algo];
    }

    function getWithdrawalHistoryLength() external view returns (uint256) {
        return withdrawalHistory.length;
    }

    function getWithdrawalHistoryRange(uint256 start, uint256 count)
        external view returns (WithdrawalRecord[] memory)
    {
        uint256 end = start + count;
        if (end > withdrawalHistory.length) {
            end = withdrawalHistory.length;
        }

        WithdrawalRecord[] memory records = new WithdrawalRecord[](end - start);
        for (uint256 i = start; i < end; i++) {
            records[i - start] = withdrawalHistory[i];
        }
        return records;
    }

    function getTimeUntilNextEpoch() external view returns (uint256) {
        uint256 nextEpochTime = lastEpochTime + epochDuration;
        if (block.timestamp >= nextEpochTime) return 0;
        return nextEpochTime - block.timestamp;
    }

    // ============================================================================
    // Admin Functions
    // ============================================================================

    function setOperator(address operator, bool authorized) external onlyOwner {
        operators[operator] = authorized;
        emit OperatorUpdated(operator, authorized);
    }

    function setMiningEngine(address engine) external onlyOwner {
        require(engine != address(0), "Invalid address");
        miningEngine = engine;
        emit MiningEngineSet(engine);
    }

    function setEpochDuration(uint256 duration) external onlyOwner {
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        epochDuration = duration;
    }

    function setAlgorithmCoinMapping(uint8 algorithm, Coin coin) external onlyOwner {
        algorithmToCoin[algorithm] = coin;
        emit AlgorithmCoinMappingUpdated(algorithm, coin);
    }

    /**
     * @dev Emergency: adjust balance if pool wallet balance differs
     * Only use if there's a discrepancy that needs correction
     */
    function adjustBalance(Coin coin, uint256 newBalance) external onlyOwner {
        coinBalances[coin] = newBalance;
    }
}
