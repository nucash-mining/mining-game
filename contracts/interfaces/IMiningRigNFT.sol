// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMiningRigNFT
 * @dev Interface for Mining Rig NFT contract
 *
 * Already Deployed:
 * - Polygon: 0x970a8b10147e3459d3cbf56329b76ac18d329728
 * - Altcoinchain: 0xf9670e5D46834561813CA79854B3d7147BBbFfb2
 */
interface IMiningRigNFT {
    /// @notice Rig trait structure
    struct RigTraits {
        uint16 hashRate;        // 1-10000 (0.01 - 100 TH/s equivalent)
        uint8 algorithm;        // 0-6 (SHA256D, Scrypt, Ethash, RandomX, Equihash, X11, kHeavyHash)
        uint8 efficiency;       // 1-100 (power efficiency rating)
        uint16 wattConsumption; // 100-5000 (WATT per hour in token units)
        uint8 rarity;           // 1-5 (Common, Uncommon, Rare, Epic, Legendary)
        uint8 cooling;          // 1-10 (cooling efficiency, affects uptime)
        uint8 durability;       // 1-100 (affects maintenance costs)
    }

    /// @notice Get traits for a specific rig
    function rigTraits(uint256 tokenId) external view returns (RigTraits memory);

    /// @notice Check if rig is currently staked in StakingPool
    function isStaked(uint256 tokenId) external view returns (bool);

    /// @notice Check if rig is currently active in MiningEngine
    function isMining(uint256 tokenId) external view returns (bool);

    /// @notice Calculate effective mining power (hashRate * efficiency / wattConsumption)
    function getEffectivePower(uint256 tokenId) external view returns (uint256);

    /// @notice Get WATT consumption per hour (in wei)
    function getWattPerHour(uint256 tokenId) external view returns (uint256);

    /// @notice Set staking status (only callable by StakingPool)
    function setStaked(uint256 tokenId, bool staked) external;

    /// @notice Set mining status (only callable by MiningEngine)
    function setMining(uint256 tokenId, bool mining) external;

    // ERC721 standard functions
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function balanceOf(address owner) external view returns (uint256);

    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event RigMinted(uint256 indexed tokenId, address indexed owner, RigTraits traits);
}
