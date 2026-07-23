// Contract addresses
export const CONTRACTS = {
  polygon: {
    // MiningGame ERC1155 contract (MING token)
    miningGame: '0x970a8b10147e3459d3cbf56329b76ac18d329728',
    miningRigNFT: '0x970a8b10147e3459d3cbf56329b76ac18d329728', // Same as miningGame
    wattToken: '0xE960d5076cd3169C343Ee287A2c3380A222e5839',
    nftStaking: '0xcbfcA68D10B2ec60a0FB2Bc58F7F0Bfd32CD5275',
  },
  altcoinchain: {
    miningGame: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2', // Altcoinchain MiningGame
    miningRigNFT: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2',
    wattToken: '0x6645143e49B3a15d8F205658903a55E520444698',
    nftStaking: '0xe463045318393095F11ed39f1a98332aBCc1A7b1',
  }
};

// Demo mode - set to false to fetch real NFTs from connected wallet
export const DEMO_MODE = false;

// Component types
export const COMPONENT_TYPES = {
  0: 'Unknown',
  1: 'Badge',
  2: 'PC',
  3: 'CPU',
  4: 'GPU',
};

/**
 * Item definitions from the contract
 *
 * Specs format (from contract):
 *   Generation   Hashrate   StakeWeight     Efficiency multiplier
 *     \ Component  |   Wattage  | Luck Boost /
 *      \   \       |      |     |     |     /
 *       0   00   0000   0000   000   00   00
 *
 * WATT Token Cost = Wattage / 100 (100W = 1 WATT token/hr)
 *
 * Balanced specs for sustainable game economy:
 *   Id 1 = Gaming PC:       1 02 0100 0050 005 00 00  (Hash 100, 0.5 WATT/hr, Stake 5)
 *   Id 2 = Genesis Badge:   1 01 0000 0000 000 10 10  (Luck +10%, Eff +10%)
 *   Id 3 = Kirtex XL1 CPU:  1 03 0080 0030 003 00 10  (Hash 80, 0.3 WATT/hr, Stake 3, Eff +10%)
 *   Id 4 = Oblivia TX120:   1 04 0060 0025 002 00 00  (Hash 60, 0.25 WATT/hr, Stake 2)
 *   Id 5 = MAD GP50 GPU:    1 04 0150 0040 004 00 05  (Hash 150, 0.4 WATT/hr, Stake 4, Eff +5%)
 *
 * Example full rig (PC + CPU + 2x TX120 + GP50 + Badge):
 *   Total Hashrate: 100 + 80 + 60 + 60 + 150 = 450 H/s
 *   Total WATT/hr: 0.5 + 0.3 + 0.25 + 0.25 + 0.4 = 1.7 WATT/hr
 *   Daily Cost: ~41 WATT tokens
 *   Stake Weight: 5 + 3 + 2 + 2 + 4 = 16 (+ Genesis bonus)
 */
// NFT metadata URLs from Wayback Machine archive of api.mining.game
export const GAME_ITEMS = {
  1: {
    id: 1,
    name: 'Gaming PC',
    type: 'PC',
    typeId: 2,
    description: 'The basic PC needed to play the Mining Game. Free to mint!',
    image: 'https://web.archive.org/web/20250308122104/https://api.mining.game/1.png',
    modelUrl: 'https://web.archive.org/web/20250308122104if_/https://api.mining.game/1.glb',
    specs: '102010000500050000', // Gen 1, PC, Hash 100, Watt 50 (0.5 WATT/hr), Stake 5
    rarity: 'common',
    freeMint: true,
  },
  2: {
    id: 2,
    name: 'Genesis Badge',
    type: 'Badge',
    typeId: 1,
    description: 'Early supporter badge. Provides luck and efficiency boosts to your rig.',
    image: 'https://web.archive.org/web/20250308122104/https://api.mining.game/2.png',
    videoUrl: 'https://web.archive.org/web/20250308122104/https://api.mining.game/2.mp4', // Video, not 3D
    modelUrl: null,
    specs: '101000000000001010', // From contract: Gen 1, Badge, Luck +10, Eff +10
    rarity: 'legendary',
    freeMint: false,
    isBooster: true,
  },
  3: {
    id: 3,
    name: 'XL1 Processor',
    type: 'CPU',
    typeId: 3,
    description: 'High-performance CPU with excellent efficiency.',
    image: 'https://web.archive.org/web/20250308122104/https://api.mining.game/3.png',
    modelUrl: 'https://web.archive.org/web/20250308122104if_/https://api.mining.game/3.glb',
    specs: '103008000300030010', // Gen 1, CPU, Hash 80, Watt 30 (0.3 WATT/hr), Stake 3, Eff +10%
    rarity: 'rare',
    freeMint: false,
  },
  4: {
    id: 4,
    name: 'TX120 GPU',
    type: 'GPU',
    typeId: 4,
    description: 'Entry-level GPU for serious miners.',
    image: 'https://web.archive.org/web/20250308122106/https://api.mining.game/4.png',
    modelUrl: 'https://web.archive.org/web/20250308122106if_/https://api.mining.game/4.glb',
    specs: '104006000250020000', // Gen 1, GPU, Hash 60, Watt 25 (0.25 WATT/hr), Stake 2
    rarity: 'uncommon',
    freeMint: false,
  },
  5: {
    id: 5,
    name: 'GP50 GPU',
    type: 'GPU',
    typeId: 4,
    description: 'Premium GPU with exceptional hashrate.',
    image: 'https://web.archive.org/web/20220418080358/https://api.mining.game/5.png',
    modelUrl: 'https://web.archive.org/web/20250308122106if_/https://api.mining.game/5.glb',
    specs: '104015000400040005', // Gen 1, GPU, Hash 150, Watt 40 (0.4 WATT/hr), Stake 4, Eff +5%
    rarity: 'epic',
    freeMint: false,
  },
};

// Rarity colors
export const RARITY_COLORS = {
  common: '#9ca3af',
  uncommon: '#10b981',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#fbbf24',
};

// Rarity multipliers for display
export const RARITY_MULTIPLIERS = {
  common: 1.0,
  uncommon: 1.25,
  rare: 1.5,
  epic: 2.0,
  legendary: 3.0,
};

// Algorithm names
export const ALGORITHMS = {
  0: { name: 'SHA256D', coin: 'BTC', color: '#f7931a' },
  1: { name: 'Scrypt', coin: 'LTC', color: '#345d9d' },
  2: { name: 'Ethash', coin: 'ETC', color: '#3c3c3d' },
  3: { name: 'RandomX', coin: 'XMR', color: '#ff6600' },
  4: { name: 'Equihash', coin: 'ALT', color: '#00d4ff' },
  5: { name: 'X11', coin: 'DASH', color: '#008de4' },
  6: { name: 'kHeavyHash', coin: 'KAS', color: '#70c7ba' },
};

// Network configs
export const NETWORKS = {
  polygon: {
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  altcoinchain: {
    chainId: '0x91a',
    chainName: 'Altcoinchain',
    nativeCurrency: { name: 'ALT', symbol: 'ALT', decimals: 18 },
    rpcUrls: ['https://rpc.altcoinchain.org'],
    blockExplorerUrls: ['https://explorer.altcoinchain.org'],
  },
};

// Slot types for rig configuration
export const SLOT_TYPES = {
  PC: { max: 1, required: true },
  CPU: { max: 1, required: false },
  GPU: { max: 4, required: false },
  Badge: { max: 1, required: false },
};
