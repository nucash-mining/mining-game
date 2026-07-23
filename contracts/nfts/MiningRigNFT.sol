// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../libraries/TraitCalculator.sol";

/**
 * @title MiningRigNFT
 * @dev ERC721 NFT representing mining rigs with unique traits
 *
 * Traits:
 * - hashRate: 1-10000 (mining power)
 * - algorithm: 0-6 (determines which coin pool to mine from)
 * - efficiency: 1-100 (power efficiency rating)
 * - wattConsumption: 100-5000 (WATT tokens consumed per hour)
 * - rarity: 0-4 (Common to Legendary)
 * - cooling: 1-10 (affects uptime/maintenance)
 * - durability: 1-100 (affects maintenance costs)
 */
contract MiningRigNFT is ERC721Enumerable, Ownable, ReentrancyGuard {
    using TraitCalculator for *;

    struct RigTraits {
        uint16 hashRate;        // 1-10000 (0.01 - 100 TH/s equivalent)
        uint8 algorithm;        // 0-6 (SHA256D, Scrypt, Ethash, RandomX, Equihash, X11, kHeavyHash)
        uint8 efficiency;       // 1-100 (power efficiency rating)
        uint16 wattConsumption; // 100-5000 (WATT per hour in token units)
        uint8 rarity;           // 0-4 (Common, Uncommon, Rare, Epic, Legendary)
        uint8 cooling;          // 1-10 (cooling efficiency, affects uptime)
        uint8 durability;       // 1-100 (affects maintenance costs)
    }

    // Token ID counter
    uint256 public nextTokenId = 1;

    // Mint price (can be updated)
    uint256 public mintPrice = 0.1 ether;

    // Maximum supply (0 = unlimited)
    uint256 public maxSupply = 0;

    // Traits storage
    mapping(uint256 => RigTraits) public rigTraits;

    // Status tracking (for game contracts)
    mapping(uint256 => bool) public isStaked;
    mapping(uint256 => bool) public isMining;

    // Authorized game contracts
    mapping(address => bool) public authorizedContracts;

    // Base URI for metadata
    string private _baseTokenURI;

    // Events
    event RigMinted(uint256 indexed tokenId, address indexed owner, RigTraits traits);
    event ContractAuthorized(address indexed contractAddress, bool authorized);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event MaxSupplyUpdated(uint256 oldSupply, uint256 newSupply);

    constructor() ERC721("WATTx Mining Rig", "WRIG") Ownable(msg.sender) {}

    // ============================================================================
    // Modifiers
    // ============================================================================

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    // ============================================================================
    // Minting
    // ============================================================================

    /**
     * @dev Public mint function
     */
    function mint() external payable nonReentrant returns (uint256) {
        require(msg.value >= mintPrice, "Insufficient payment");
        require(maxSupply == 0 || nextTokenId <= maxSupply, "Max supply reached");

        uint256 tokenId = nextTokenId++;
        RigTraits memory traits = _generateTraits(tokenId, msg.sender);

        rigTraits[tokenId] = traits;
        _safeMint(msg.sender, tokenId);

        // Refund excess payment
        if (msg.value > mintPrice) {
            payable(msg.sender).transfer(msg.value - mintPrice);
        }

        emit RigMinted(tokenId, msg.sender, traits);
        return tokenId;
    }

    /**
     * @dev Batch mint multiple rigs
     */
    function mintBatch(uint256 count) external payable nonReentrant returns (uint256[] memory) {
        require(count > 0 && count <= 10, "Invalid count");
        require(msg.value >= mintPrice * count, "Insufficient payment");
        require(maxSupply == 0 || nextTokenId + count - 1 <= maxSupply, "Exceeds max supply");

        uint256[] memory tokenIds = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = nextTokenId++;
            RigTraits memory traits = _generateTraits(tokenId, msg.sender);

            rigTraits[tokenId] = traits;
            _safeMint(msg.sender, tokenId);

            tokenIds[i] = tokenId;
            emit RigMinted(tokenId, msg.sender, traits);
        }

        // Refund excess payment
        uint256 totalCost = mintPrice * count;
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        return tokenIds;
    }

    /**
     * @dev Owner can mint for free (airdrops, rewards)
     */
    function ownerMint(address to) external onlyOwner returns (uint256) {
        require(maxSupply == 0 || nextTokenId <= maxSupply, "Max supply reached");

        uint256 tokenId = nextTokenId++;
        RigTraits memory traits = _generateTraits(tokenId, to);

        rigTraits[tokenId] = traits;
        _safeMint(to, tokenId);

        emit RigMinted(tokenId, to, traits);
        return tokenId;
    }

    // ============================================================================
    // Trait Generation
    // ============================================================================

    /**
     * @dev Generate traits for a new rig
     */
    function _generateTraits(uint256 tokenId, address minter) internal view returns (RigTraits memory) {
        uint256 seed = TraitCalculator.generateSeed(
            tokenId,
            minter,
            block.timestamp,
            block.prevrandao
        );

        // Roll rarity first (affects other stats)
        uint8 rarity = TraitCalculator.rollRarity(seed % 1000);
        uint16 rarityMultiplier = TraitCalculator.getRarityMultiplier(rarity);

        // Generate base stats with rarity scaling
        uint256 baseHashRate = TraitCalculator.random(seed, 1) % 5000 + 100;
        uint256 baseEfficiency = TraitCalculator.random(seed, 3) % 60 + 20;
        uint256 baseDurability = TraitCalculator.random(seed, 6) % 50 + 30;

        return RigTraits({
            hashRate: uint16((baseHashRate * rarityMultiplier) / 100),
            algorithm: uint8(TraitCalculator.random(seed, 2) % 7),
            efficiency: uint8(min((baseEfficiency * rarityMultiplier) / 150, 100)),
            wattConsumption: uint16(TraitCalculator.random(seed, 4) % 2000 + 500),
            rarity: rarity,
            cooling: uint8(min(TraitCalculator.random(seed, 5) % 8 + 1 + rarity, 10)),
            durability: uint8(min((baseDurability * rarityMultiplier) / 150, 100))
        });
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    // ============================================================================
    // Game Contract Integration
    // ============================================================================

    /**
     * @dev Set staking status (only callable by authorized contracts)
     */
    function setStaked(uint256 tokenId, bool staked) external onlyAuthorized {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        isStaked[tokenId] = staked;
    }

    /**
     * @dev Set mining status (only callable by authorized contracts)
     */
    function setMining(uint256 tokenId, bool mining) external onlyAuthorized {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        isMining[tokenId] = mining;
    }

    /**
     * @dev Authorize a game contract
     */
    function setAuthorizedContract(address contractAddress, bool authorized) external onlyOwner {
        authorizedContracts[contractAddress] = authorized;
        emit ContractAuthorized(contractAddress, authorized);
    }

    // ============================================================================
    // View Functions
    // ============================================================================

    /**
     * @dev Get full rig traits struct
     */
    function getRigTraits(uint256 tokenId) external view returns (RigTraits memory) {
        return rigTraits[tokenId];
    }

    /**
     * @dev Calculate effective mining power
     */
    function getEffectivePower(uint256 tokenId) external view returns (uint256) {
        RigTraits memory t = rigTraits[tokenId];
        return TraitCalculator.calculateEffectivePower(t.hashRate, t.efficiency, t.wattConsumption);
    }

    /**
     * @dev Get WATT consumption per hour (in wei)
     */
    function getWattPerHour(uint256 tokenId) external view returns (uint256) {
        return uint256(rigTraits[tokenId].wattConsumption) * 1e18;
    }

    /**
     * @dev Get stake weight for staking pool
     */
    function getStakeWeight(uint256 tokenId) external view returns (uint256) {
        RigTraits memory t = rigTraits[tokenId];
        return TraitCalculator.calculateStakeWeight(t.hashRate, t.efficiency, t.rarity);
    }

    /**
     * @dev Get algorithm name for a rig
     */
    function getAlgorithmName(uint256 tokenId) external view returns (string memory) {
        return TraitCalculator.getAlgorithmName(rigTraits[tokenId].algorithm);
    }

    /**
     * @dev Get rarity name for a rig
     */
    function getRarityName(uint256 tokenId) external view returns (string memory) {
        return TraitCalculator.getRarityName(rigTraits[tokenId].rarity);
    }

    /**
     * @dev Get all token IDs owned by an address
     */
    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokens;
    }

    // ============================================================================
    // Admin Functions
    // ============================================================================

    /**
     * @dev Update mint price
     */
    function setMintPrice(uint256 newPrice) external onlyOwner {
        emit MintPriceUpdated(mintPrice, newPrice);
        mintPrice = newPrice;
    }

    /**
     * @dev Update max supply (0 = unlimited)
     */
    function setMaxSupply(uint256 newMaxSupply) external onlyOwner {
        require(newMaxSupply == 0 || newMaxSupply >= nextTokenId - 1, "Below minted count");
        emit MaxSupplyUpdated(maxSupply, newMaxSupply);
        maxSupply = newMaxSupply;
    }

    /**
     * @dev Set base URI for metadata
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Withdraw contract balance
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        payable(owner()).transfer(balance);
    }

    // ============================================================================
    // Overrides
    // ============================================================================

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Prevent transfers while staked or mining
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from = address(0))
        if (from != address(0)) {
            require(!isStaked[tokenId], "Cannot transfer staked rig");
            require(!isMining[tokenId], "Cannot transfer mining rig");
        }

        return super._update(to, tokenId, auth);
    }
}
