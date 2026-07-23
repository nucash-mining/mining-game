// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TraitCalculator
 * @dev Library for calculating NFT trait values and mining effectiveness
 */
library TraitCalculator {
    /// @notice Algorithm types that map to parent chains
    enum Algorithm {
        SHA256D,     // 0 - Bitcoin
        SCRYPT,      // 1 - Litecoin
        ETHASH,      // 2 - Ethereum Classic
        RANDOMX,     // 3 - Monero
        EQUIHASH,    // 4 - Zcash/Altcoinchain
        X11,         // 5 - Dash
        KHEAVYHASH   // 6 - Kaspa
    }

    /// @notice Rarity levels
    enum Rarity {
        COMMON,      // 0
        UNCOMMON,    // 1
        RARE,        // 2
        EPIC,        // 3
        LEGENDARY    // 4
    }

    /// @notice Get rarity multiplier (100 = 1x)
    function getRarityMultiplier(uint8 rarity) internal pure returns (uint16) {
        if (rarity == 0) return 100;   // Common: 1x
        if (rarity == 1) return 125;   // Uncommon: 1.25x
        if (rarity == 2) return 160;   // Rare: 1.6x
        if (rarity == 3) return 220;   // Epic: 2.2x
        if (rarity == 4) return 300;   // Legendary: 3x
        return 100;
    }

    /// @notice Roll rarity from random seed (0-999)
    /// @return rarity 0-4 based on probability distribution
    function rollRarity(uint256 roll) internal pure returns (uint8) {
        // Probability distribution:
        // Common:    50.0% (0-499)
        // Uncommon:  30.0% (500-799)
        // Rare:      15.0% (800-949)
        // Epic:       4.5% (950-994)
        // Legendary:  0.5% (995-999)
        if (roll < 500) return 0;      // Common
        if (roll < 800) return 1;      // Uncommon
        if (roll < 950) return 2;      // Rare
        if (roll < 995) return 3;      // Epic
        return 4;                       // Legendary
    }

    /// @notice Calculate effective mining power
    /// @param hashRate Base hash rate (1-10000)
    /// @param efficiency Efficiency rating (1-100)
    /// @param wattConsumption WATT per hour (100-5000)
    /// @return Effective power score
    function calculateEffectivePower(
        uint16 hashRate,
        uint8 efficiency,
        uint16 wattConsumption
    ) internal pure returns (uint256) {
        // effectivePower = hashRate * efficiency * 100 / wattConsumption
        // Higher is better: more hash per WATT consumed
        return uint256(hashRate) * uint256(efficiency) * 100 / uint256(wattConsumption);
    }

    /// @notice Calculate stake weight for staking pool
    /// @param hashRate Base hash rate
    /// @param efficiency Efficiency rating
    /// @param rarity Rarity level (0-4)
    /// @return Stake weight
    function calculateStakeWeight(
        uint16 hashRate,
        uint8 efficiency,
        uint8 rarity
    ) internal pure returns (uint256) {
        uint256 rarityMult = getRarityMultiplier(rarity);
        return uint256(hashRate) * uint256(efficiency) * rarityMult / 100;
    }

    /// @notice Get algorithm name
    function getAlgorithmName(uint8 algo) internal pure returns (string memory) {
        if (algo == 0) return "SHA256D";
        if (algo == 1) return "Scrypt";
        if (algo == 2) return "Ethash";
        if (algo == 3) return "RandomX";
        if (algo == 4) return "Equihash";
        if (algo == 5) return "X11";
        if (algo == 6) return "kHeavyHash";
        return "Unknown";
    }

    /// @notice Get rarity name
    function getRarityName(uint8 rarity) internal pure returns (string memory) {
        if (rarity == 0) return "Common";
        if (rarity == 1) return "Uncommon";
        if (rarity == 2) return "Rare";
        if (rarity == 3) return "Epic";
        if (rarity == 4) return "Legendary";
        return "Unknown";
    }

    /// @notice Generate pseudo-random number from seed
    function random(uint256 seed, uint256 nonce) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(seed, nonce)));
    }

    /// @notice Generate seed from block data and token
    function generateSeed(
        uint256 tokenId,
        address minter,
        uint256 blockTimestamp,
        uint256 blockPrevrandao
    ) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            blockTimestamp,
            blockPrevrandao,
            tokenId,
            minter
        )));
    }
}
