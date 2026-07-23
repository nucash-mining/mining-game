import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, GAME_ITEMS, DEMO_MODE } from '../utils/constants';
import { MINING_GAME_ABI } from '../utils/contractABI';

// IPFS gateway for fetching metadata
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

// Convert IPFS URI to HTTP URL
function ipfsToHttp(uri) {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) {
    return IPFS_GATEWAY + uri.slice(7);
  }
  if (uri.startsWith('https://') || uri.startsWith('http://')) {
    return uri;
  }
  return IPFS_GATEWAY + uri;
}

// Fetch metadata from token URI
async function fetchTokenMetadata(uri) {
  try {
    const url = ipfsToHttp(uri);
    if (!url) return null;

    const response = await fetch(url);
    if (!response.ok) return null;

    const metadata = await response.json();
    return {
      name: metadata.name,
      description: metadata.description,
      image: ipfsToHttp(metadata.image),
      animation_url: ipfsToHttp(metadata.animation_url), // .glb file usually here
      model: ipfsToHttp(metadata.model || metadata.animation_url),
      attributes: metadata.attributes || [],
    };
  } catch (err) {
    console.error('Error fetching metadata:', err);
    return null;
  }
}

export function useInventory(provider, account, chainId) {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getContractAddress = useCallback(() => {
    if (chainId === 137) return CONTRACTS.polygon.miningGame;
    if (chainId === 2330) return CONTRACTS.altcoinchain.miningGame;
    return null;
  }, [chainId]);

  const fetchInventory = useCallback(async () => {
    if (!provider || !account) {
      setInventory([]);
      return;
    }

    const contractAddress = getContractAddress();

    // Use demo mode if enabled or contract not configured
    if (DEMO_MODE || !contractAddress || contractAddress === '0x...') {
      // Demo mode - show sample inventory
      setInventory(getDemoInventory());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = new ethers.Contract(
        contractAddress,
        MINING_GAME_ABI,
        provider
      );

      // Fetch balances for all known items (IDs 1-5)
      const itemIds = [1, 2, 3, 4, 5];
      const addresses = itemIds.map(() => account);

      const balances = await contract.balanceOfBatch(addresses, itemIds);

      // Debug: Log balances from wallet
      console.log('NFT Balances from wallet:', itemIds.map((id, i) => ({
        id,
        name: GAME_ITEMS[id]?.name,
        balance: Number(balances[i])
      })));

      // Build inventory with item details
      const inventoryItems = [];

      for (let i = 0; i < itemIds.length; i++) {
        const balance = Number(balances[i]);
        if (balance > 0) {
          const itemId = itemIds[i];
          const itemData = GAME_ITEMS[itemId];

          if (itemData) {
            // Fetch specs from contract
            let specs;
            try {
              specs = await contract._specs(itemId);
            } catch {
              specs = itemData.specs;
            }

            // Fetch token URI and metadata
            let metadata = null;
            try {
              const tokenUri = await contract.uri(itemId);
              if (tokenUri) {
                metadata = await fetchTokenMetadata(tokenUri);
              }
            } catch (err) {
              console.warn(`Could not fetch URI for token ${itemId}:`, err);
            }

            inventoryItems.push({
              ...itemData,
              balance,
              specs: specs.toString(),
              // Override with contract metadata if available
              ...(metadata && {
                name: metadata.name || itemData.name,
                description: metadata.description || itemData.description,
                image: metadata.image || itemData.image,
                modelUrl: metadata.model || metadata.animation_url,
                metadata,
              }),
            });
          }
        }
      }

      setInventory(inventoryItems);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to fetch inventory');
      // Fall back to demo mode
      setInventory(getDemoInventory());
    } finally {
      setIsLoading(false);
    }
  }, [provider, account, getContractAddress]);

  // Demo inventory for testing without contract
  const getDemoInventory = () => {
    return [
      { ...GAME_ITEMS[1], balance: 1 }, // Gaming PC
      { ...GAME_ITEMS[2], balance: 1 }, // Genesis Badge
      { ...GAME_ITEMS[3], balance: 2 }, // XL1 CPU (x2 for testing)
      { ...GAME_ITEMS[4], balance: 4 }, // TX120 GPU (x4 for full rig)
      { ...GAME_ITEMS[5], balance: 4 }, // GP50 GPU (x4 for full rig)
    ];
  };

  // Fetch inventory when account or chain changes
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Check if user has Genesis Badge
  const hasGenesisBadge = inventory.some(
    item => item.id === 2 && item.balance > 0
  );

  // Get items by type
  const getItemsByType = (type) => {
    return inventory.filter(item => item.type === type);
  };

  // Get available items (not used in any rig)
  const getAvailableItems = (usedItems = []) => {
    return inventory.map(item => {
      const usedCount = usedItems.filter(u => u?.id === item.id).length;
      return {
        ...item,
        availableBalance: item.balance - usedCount,
      };
    }).filter(item => item.availableBalance > 0);
  };

  return {
    inventory,
    isLoading,
    error,
    refetch: fetchInventory,
    hasGenesisBadge,
    getItemsByType,
    getAvailableItems,
  };
}
