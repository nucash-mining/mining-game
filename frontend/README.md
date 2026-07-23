# Mining Rig Builder - WATTx Mining Game

A React-based GUI for building custom mining rigs using components from the Mining.Game ERC1155 NFT contract.

## Features

- **Wallet Connection**: Connect via MetaMask to Polygon or Altcoinchain
- **Inventory Display**: View all your Mining.Game components
- **Rig Builder**: Drag-and-drop interface for configuring rigs
- **Stats Calculator**: Real-time calculation of mining weight, efficiency, and more
- **Genesis Badge Support**: Automatic bonuses for Genesis Badge holders

## Components

The game includes these item types:

| ID | Item | Type | Rarity | Stats |
|----|------|------|--------|-------|
| 1 | Gaming PC | PC | Common | Free mint starter |
| 2 | Genesis Badge | Badge | Legendary | +10% Luck & Efficiency |
| 3 | Kirtex XL1 CPU | CPU | Rare | High efficiency |
| 4 | Oblivia TX120 GPU | GPU | Uncommon | Entry-level GPU |
| 5 | MAD GP50 GPU | GPU | Epic | Premium hashrate |

## Stats Explained

The contract uses an 18-digit specs number:

```
Position 1:     Generation (0-9)
Position 2-3:   Component type (01=Badge, 02=PC, 03=CPU, 04=GPU)
Position 4-7:   Hashrate (0000-9999)
Position 8-11:  Wattage (0000-9999)
Position 12-14: Stake Weight (000-999)
Position 15-16: Luck Boost (00-99)
Position 17-18: Efficiency Multiplier (00-99)
```

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure contract address:
Edit `src/utils/constants.js` and update the `miningGame` contract address for your network.

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Demo Mode

By default, the app runs in demo mode with sample inventory. To use the actual contract:

1. Set `DEMO_MODE = false` in `src/utils/constants.js`
2. Add the MiningGame contract address for your network

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- ethers.js v6
- Framer Motion

## Networks Supported

- **Polygon** (Chain ID: 137)
- **Altcoinchain** (Chain ID: 2330)

## Contract Integration

The frontend interacts with the MiningGame ERC1155 contract:
- `balanceOfBatch`: Fetch user inventory
- `_specs(id)`: Get component specifications
- `freemint(id, amount)`: Mint free Gaming PC

## License

MIT
