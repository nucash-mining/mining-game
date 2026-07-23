import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { NETWORKS } from '../utils/constants';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (err) {
          console.error('Error checking wallet connection:', err);
        }
      }
    };
    checkConnection();
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = (newChainId) => {
    setChainId(parseInt(newChainId, 16));
    // Reload page on chain change for safety
    window.location.reload();
  };

  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask or another Web3 wallet');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();

      setAccount(accounts[0]);
      setProvider(browserProvider);
      setSigner(signer);
      setChainId(Number(network.chainId));
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  }, []);

  const switchNetwork = useCallback(async (networkKey) => {
    const network = NETWORKS[networkKey];
    if (!network) {
      setError('Invalid network');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });
    } catch (switchError) {
      // Network not added, try to add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network],
          });
        } catch (addError) {
          setError('Failed to add network');
        }
      } else {
        setError('Failed to switch network');
      }
    }
  }, []);

  const getNetworkName = useCallback(() => {
    if (!chainId) return 'Not Connected';

    if (chainId === 137) return 'Polygon';
    if (chainId === 2330) return 'Altcoinchain';
    if (chainId === 1) return 'Ethereum';
    if (chainId === 31337) return 'Localhost';

    return `Chain ${chainId}`;
  }, [chainId]);

  const isCorrectNetwork = useCallback(() => {
    return chainId === 137 || chainId === 2330; // Polygon or Altcoinchain
  }, [chainId]);

  return {
    account,
    provider,
    signer,
    chainId,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getNetworkName,
    isCorrectNetwork,
    isConnected: !!account,
  };
}
