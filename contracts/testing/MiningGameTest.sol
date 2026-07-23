// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../nfts/MiningRigNFT.sol";
import "../game/GamePool.sol";
import "../game/MiningEngine.sol";
import "../game/StakingPool.sol";

/**
 * @title MiningGameTest
 * @dev Test helper contract for mining game integration testing
 */
contract MiningGameTest {
    MiningRigNFT public rigNFT;
    GamePool public gamePool;
    MiningEngine public miningEngine;
    StakingPool public stakingPool;
    address public wattToken;

    event TestResult(string testName, bool passed, string message);

    constructor(
        address _rigNFT,
        address _gamePool,
        address _miningEngine,
        address _stakingPool,
        address _wattToken
    ) {
        rigNFT = MiningRigNFT(_rigNFT);
        gamePool = GamePool(_gamePool);
        miningEngine = MiningEngine(_miningEngine);
        stakingPool = StakingPool(_stakingPool);
        wattToken = _wattToken;
    }

    /**
     * @dev Test NFT minting and trait generation
     */
    function testMintRig() external payable returns (uint256) {
        // Mint a rig
        uint256 tokenId = rigNFT.mint{value: msg.value}();

        // Verify ownership
        require(rigNFT.ownerOf(tokenId) == address(this), "Ownership failed");

        // Verify traits are set
        MiningRigNFT.RigTraits memory traits = rigNFT.getRigTraits(tokenId);
        require(traits.hashRate > 0, "HashRate not set");
        require(traits.algorithm < 7, "Invalid algorithm");
        require(traits.rarity <= 4, "Invalid rarity");

        emit TestResult("testMintRig", true, "Rig minted successfully");
        return tokenId;
    }

    /**
     * @dev Test effective power calculation
     */
    function testEffectivePower(uint256 tokenId) external view returns (uint256) {
        uint256 power = rigNFT.getEffectivePower(tokenId);
        require(power > 0, "Power should be positive");
        return power;
    }

    /**
     * @dev Test WATT consumption calculation
     */
    function testWattPerHour(uint256 tokenId) external view returns (uint256) {
        uint256 wattPerHour = rigNFT.getWattPerHour(tokenId);
        require(wattPerHour >= 100 * 1e18 && wattPerHour <= 5000 * 1e18, "Invalid WATT/hour");
        return wattPerHour;
    }

    /**
     * @dev Test algorithm to coin mapping
     */
    function testAlgorithmMapping() external view returns (bool) {
        // Test all 7 algorithms
        for (uint8 i = 0; i < 7; i++) {
            GamePool.Coin coin = gamePool.getCoinForAlgorithm(i);
            // Just verify it doesn't revert
            require(uint8(coin) <= 6, "Invalid coin");
        }
        return true;
    }

    /**
     * @dev Get comprehensive rig info
     */
    function getRigInfo(uint256 tokenId) external view returns (
        uint16 hashRate,
        uint8 algorithm,
        string memory algorithmName,
        uint8 efficiency,
        uint16 wattConsumption,
        uint8 rarity,
        string memory rarityName,
        uint8 cooling,
        uint8 durability,
        uint256 effectivePower,
        uint256 stakeWeight,
        bool isStaked,
        bool isMining
    ) {
        MiningRigNFT.RigTraits memory traits = rigNFT.getRigTraits(tokenId);

        return (
            traits.hashRate,
            traits.algorithm,
            rigNFT.getAlgorithmName(tokenId),
            traits.efficiency,
            traits.wattConsumption,
            traits.rarity,
            rigNFT.getRarityName(tokenId),
            traits.cooling,
            traits.durability,
            rigNFT.getEffectivePower(tokenId),
            rigNFT.getStakeWeight(tokenId),
            rigNFT.isStaked(tokenId),
            rigNFT.isMining(tokenId)
        );
    }

    // Allow receiving ETH for minting
    receive() external payable {}
}
