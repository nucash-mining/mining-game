# Mining Game - NFT Mining Rig Builder dApp

A web3 dApp for building virtual mining rigs using NFT components on Polygon and Altcoinchain networks.

## Overview

Build your mining rig by combining NFT components:
- **Gaming PC** - Base system (required)
- **CPU** - Processor to boost hashrate
- **GPU** - Graphics cards (up to 4) for maximum power

## Deployed Contracts

### Polygon Network (Chain ID: 137)
| Contract | Address |
|----------|---------|
| Mining Game NFT (ERC1155) | `0x970a8b10147e3459d3cbf56329b76ac18d329728` |
| WATT Token | `0xE960d5076cd3169C343Ee287A2c3380A222e5839` |
| NFT Staking | `0xcbfcA68D10B2ec60a0FB2Bc58F7F0Bfd32CD5275` |

### Altcoinchain Network (Chain ID: 2330)
| Contract | Address |
|----------|---------|
| Mining Game NFT (ERC1155) | `0xf9670e5D46834561813CA79854B3d7147BBbFfb2` |
| WATT Token | `0x6645143e49B3a15d8F205658903a55E520444698` |
| NFT Staking | `0xe463045318393095F11ed39f1a98332aBCc1A7b1` |

## NFT Components

| ID | Name | Type | Hashrate | WATT/hr | Rarity |
|----|------|------|----------|---------|--------|
| 1 | Gaming PC | PC | 100 H/s | 0.5 | Common |
| 2 | Genesis Badge | Badge | - | - | Legendary |
| 3 | XL1 Processor | CPU | 80 H/s | 0.3 | Rare |
| 4 | TX120 GPU | GPU | 60 H/s | 0.25 | Uncommon |
| 5 | GP50 GPU | GPU | 150 H/s | 0.4 | Epic |

## 3D Model Files (GLB)

Located in root directory:
- `Free Mint PC case.glb` - Gaming PC model
- `GP 50 GPU.glb` - GP50 GPU model
- `GP 720.glb` - Additional GPU model
- `bit hammer.glb` - Accessory
- `keyboard.glb` - Keyboard model
- `mouse.glb` - Mouse model
- `monitor.glb` - Monitor model
- `motherboard.glb` - Motherboard model
- `mining rig frame.glb` - Mining rig frame
- `assembledglb.glb` - Assembled rig model

Blender source files:
- `CpuCaseProject.blend`
- `CpuCaseProject Built.blend`

## Project Structure

```
mining game/
├── *.glb                # 3D model files
├── *.blend              # Blender source files
├── Components/          # Additional component assets
├── contracts/           # Solidity smart contracts
│   ├── game/           # Core game contracts
│   ├── interfaces/     # Contract interfaces
│   ├── libraries/      # Helper libraries
│   ├── nfts/           # NFT contracts
│   └── testing/        # Test contracts
├── frontend/           # React frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── hooks/      # React hooks
│   │   ├── utils/      # Utilities & constants
│   │   └── styles/     # CSS styles
│   └── token-metadata.json
├── scripts/            # Deployment scripts
└── test/               # Contract tests
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Contract Deployment

```bash
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network polygon
```

## NFT Metadata API

Original API (offline): `https://api.mining.game/`

Archived metadata available via Wayback Machine:
- Token 1: `https://web.archive.org/web/20250308122104if_/https://api.mining.game/1.glb`
- Token 3: `https://web.archive.org/web/20250308122104if_/https://api.mining.game/3.glb`
- Token 4: `https://web.archive.org/web/20250308122106if_/https://api.mining.game/4.glb`
- Token 5: `https://web.archive.org/web/20250308122106if_/https://api.mining.game/5.glb`

## Features

### Implemented
- Wallet connection (MetaMask)
- NFT inventory display
- Rig builder interface
- Real-time stats calculation
- NFT staking interface
- Multi-network support (Polygon, Altcoinchain)

### Coming Soon
- 3D Rig Builder (interactive 3D models)
- Deploy rig to mining pool
- Mining rewards

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Web3**: ethers.js v6
- **Contracts**: Solidity 0.8.19, Hardhat
- **3D Models**: Blender, GLB format
- **Networks**: Polygon, Altcoinchain

## License

MIT
