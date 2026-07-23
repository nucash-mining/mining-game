import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import RigBuilder from './components/RigBuilder';
import StakingPanel from './components/StakingPanel';
import { useWallet } from './hooks/useWallet';
import { useInventory } from './hooks/useInventory';
import { useStaking } from './hooks/useStaking';
import { CONTRACTS, GAME_ITEMS } from './utils/constants';
import { MINING_GAME_ABI } from './utils/contractABI';

function App() {
  const {
    account,
    provider,
    signer,
    chainId,
    isConnecting,
    connectWallet,
    getNetworkName,
    isCorrectNetwork,
  } = useWallet();

  const {
    inventory,
    isLoading: isLoadingInventory,
    hasGenesisBadge,
    refetch: refetchInventory,
  } = useInventory(provider, account, chainId);

  const {
    stakedNFTs,
    pendingRewards,
    isLoading: isLoadingStaking,
    isApproved,
    approveStaking,
    stakeNFT,
    stakeBatch,
    unstakeNFT,
    unstakeAll,
    claimRewards,
    claimAllRewards,
    refetch: refetchStaking,
  } = useStaking(provider, signer, account, chainId);

  const [isMinting, setIsMinting] = useState(false);
  const [activeTab, setActiveTab] = useState('builder'); // 'builder', '3d', or 'staking'

  // Get contract address for current network
  const getContractAddress = useCallback(() => {
    if (chainId === 137) return CONTRACTS.polygon.miningGame;
    if (chainId === 2330) return CONTRACTS.altcoinchain.miningGame;
    return null;
  }, [chainId]);

  // Handle free mint of Gaming PC
  const handleFreeMint = async () => {
    if (!signer) {
      toast.error('Please connect your wallet first');
      return;
    }

    const contractAddress = getContractAddress();
    if (!contractAddress || contractAddress === '0x...') {
      toast.error('Contract not deployed on this network');
      return;
    }

    setIsMinting(true);
    const loadingToast = toast.loading('Minting your Gaming PC...');

    try {
      const contract = new ethers.Contract(contractAddress, MINING_GAME_ABI, signer);

      // Check if user already has a Gaming PC
      const balance = await contract.balanceOf(account, 1);
      if (balance > 0n) {
        toast.dismiss(loadingToast);
        toast.error('You already own a Gaming PC!');
        return;
      }

      // Free mint Gaming PC (id = 1, amount = 1)
      const tx = await contract.freemint(1, 1);
      toast.dismiss(loadingToast);
      toast.loading('Transaction submitted. Waiting for confirmation...');

      await tx.wait();
      toast.dismiss();
      toast.success('Gaming PC minted successfully!');

      // Refresh inventory
      refetchInventory();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Mint error:', error);

      if (error.message.includes('You can only own one FREE PC NFT')) {
        toast.error('You already own a Gaming PC!');
      } else if (error.message.includes('user rejected')) {
        toast.error('Transaction cancelled');
      } else {
        toast.error('Failed to mint: ' + (error.reason || error.message));
      }
    } finally {
      setIsMinting(false);
    }
  };

  // Staking handlers with toast notifications
  const handleApproveStaking = async () => {
    const loadingToast = toast.loading('Approving staking contract...');
    try {
      await approveStaking();
      toast.dismiss(loadingToast);
      toast.success('Staking approved!');
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Approval failed: ' + (error.reason || error.message));
    }
  };

  const handleStake = async (tokenId, amount) => {
    const loadingToast = toast.loading('Staking NFT...');
    try {
      await stakeNFT(tokenId, amount);
      toast.dismiss(loadingToast);
      toast.success('NFT staked successfully!');
      refetchInventory();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Staking failed: ' + (error.reason || error.message));
    }
  };

  const handleUnstake = async (depositId) => {
    const loadingToast = toast.loading('Unstaking NFT...');
    try {
      await unstakeNFT(depositId);
      toast.dismiss(loadingToast);
      toast.success('NFT unstaked successfully!');
      refetchInventory();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Unstake failed: ' + (error.reason || error.message));
    }
  };

  const handleUnstakeAll = async () => {
    const loadingToast = toast.loading('Unstaking all NFTs...');
    try {
      await unstakeAll();
      toast.dismiss(loadingToast);
      toast.success('All NFTs unstaked!');
      refetchInventory();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Unstake failed: ' + (error.reason || error.message));
    }
  };

  const handleClaimRewards = async (depositId) => {
    const loadingToast = toast.loading('Claiming rewards...');
    try {
      await claimRewards(depositId);
      toast.dismiss(loadingToast);
      toast.success('Rewards claimed!');
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Claim failed: ' + (error.reason || error.message));
    }
  };

  const handleClaimAllRewards = async () => {
    const loadingToast = toast.loading('Claiming all rewards...');
    try {
      await claimAllRewards();
      toast.dismiss(loadingToast);
      toast.success('All rewards claimed!');
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Claim failed: ' + (error.reason || error.message));
    }
  };

  return (
    <div className="min-h-screen">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a0f1a',
            color: '#e2e8f0',
            border: '1px solid rgba(0, 212, 255, 0.3)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#0a0f1a',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0a0f1a',
            },
          },
        }}
      />

      <Header
        account={account}
        chainId={chainId}
        isConnecting={isConnecting}
        onConnect={connectWallet}
        getNetworkName={getNetworkName}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!account ? (
          // Not connected state
          <div className="text-center py-20">
            <div className="inline-block p-8 rounded-2xl bg-mining-dark border border-mining-primary/30">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-mining-primary to-mining-secondary flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Mining Rig Builder</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Connect your wallet to view your components, build custom mining rigs,
                and stake your NFTs for rewards.
              </p>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="btn-primary text-lg px-8 py-4"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        ) : !isCorrectNetwork() ? (
          // Wrong network state
          <div className="text-center py-20">
            <div className="inline-block p-8 rounded-2xl bg-mining-dark border border-mining-warning/30">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-mining-warning/20 flex items-center justify-center">
                <svg className="w-12 h-12 text-mining-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Wrong Network</h2>
              <p className="text-gray-400 mb-6">
                Please switch to Polygon or Altcoinchain to use the Mining Rig Builder.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Current network: {getNetworkName()}
              </p>
            </div>
          </div>
        ) : isLoadingInventory ? (
          // Loading state
          <div className="text-center py-20">
            <div className="inline-block">
              <div className="w-16 h-16 border-4 border-mining-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading your components...</p>
            </div>
          </div>
        ) : (
          // Main content with tabs
          <>
            {/* Genesis Badge Banner */}
            {hasGenesisBadge && (
              <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-mining-gold/20 to-mining-gold/5 border border-mining-gold/30 genesis-glow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏆</span>
                    <div>
                      <h4 className="font-semibold text-mining-gold">Genesis Badge Holder</h4>
                      <p className="text-sm text-gray-400">+10% Luck & Efficiency bonuses available</p>
                    </div>
                  </div>
                  <span className="text-mining-gold text-sm">Early Supporter</span>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setActiveTab('builder')}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'builder'
                    ? 'bg-gradient-to-r from-mining-primary to-mining-secondary text-white shadow-lg shadow-mining-primary/25'
                    : 'bg-[#1a1a2e] text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                <span className="text-xl">🔧</span>
                Rig Builder
              </button>
              <button
                onClick={() => setActiveTab('3d')}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  activeTab === '3d'
                    ? 'bg-gradient-to-r from-mining-primary to-mining-secondary text-white shadow-lg shadow-mining-primary/25'
                    : 'bg-[#1a1a2e] text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                <span className="text-xl">🎮</span>
                3D Builder
              </button>
              <button
                onClick={() => setActiveTab('staking')}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'staking'
                    ? 'bg-gradient-to-r from-mining-primary to-mining-secondary text-white shadow-lg shadow-mining-primary/25'
                    : 'bg-[#1a1a2e] text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                <span className="text-xl">💎</span>
                NFT Staking
                {stakedNFTs.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-mining-accent rounded-full">
                    {stakedNFTs.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'builder' && (
              <RigBuilder
                inventory={inventory}
                hasGenesisBadge={hasGenesisBadge}
                onFreeMint={handleFreeMint}
              />
            )}

            {activeTab === '3d' && (
              <div className="flex items-center justify-center h-[600px] rounded-2xl bg-gradient-to-b from-[#0a0f1a] to-[#1a1a2e] border border-gray-800">
                <div className="text-center p-8">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-mining-primary/20 to-mining-secondary/20 border border-mining-primary/30 flex items-center justify-center">
                    <span className="text-5xl">🎮</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">3D Rig Builder</h3>
                  <p className="text-mining-primary text-lg font-semibold mb-2">Coming Soon</p>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">
                    Build and visualize your mining rig in an interactive 3D environment.
                    Drag and drop components, rotate your rig, and see it come to life.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 text-sm">
                    <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">3D Models</span>
                    <span className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">Drag & Drop</span>
                    <span className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30">Interactive</span>
                    <span className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Real-time Stats</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'staking' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StakingPanel
                  inventory={inventory}
                  stakedNFTs={stakedNFTs}
                  pendingRewards={pendingRewards}
                  isApproved={isApproved}
                  isLoading={isLoadingStaking}
                  onApprove={handleApproveStaking}
                  onStake={handleStake}
                  onUnstake={handleUnstake}
                  onUnstakeAll={handleUnstakeAll}
                  onClaimRewards={handleClaimRewards}
                  onClaimAllRewards={handleClaimAllRewards}
                />

                {/* Staking Info Panel */}
                <div className="space-y-6">
                  <div className="card-dark p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">📖</span>
                      How Staking Works
                    </h3>
                    <div className="space-y-4 text-sm text-gray-400">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-mining-primary/20 flex items-center justify-center text-mining-primary font-bold flex-shrink-0">
                          1
                        </div>
                        <div>
                          <h4 className="font-medium text-white">Approve & Stake</h4>
                          <p>Approve the staking contract, then stake your Mining Game NFTs to start earning WATT rewards.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-mining-primary/20 flex items-center justify-center text-mining-primary font-bold flex-shrink-0">
                          2
                        </div>
                        <div>
                          <h4 className="font-medium text-white">Earn Rewards</h4>
                          <p>Rewards accumulate based on your NFT's stake weight. Higher rarity = higher weight.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-mining-primary/20 flex items-center justify-center text-mining-primary font-bold flex-shrink-0">
                          3
                        </div>
                        <div>
                          <h4 className="font-medium text-white">Claim & Unstake</h4>
                          <p>Claim your WATT rewards anytime. Unstake after the lock period to get your NFT back.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stake Weights Info */}
                  <div className="card-dark p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">⚖️</span>
                      Stake Weights
                    </h3>
                    <div className="space-y-2">
                      {Object.values(GAME_ITEMS).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a2e]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {item.type === 'PC' && '🖥️'}
                              {item.type === 'CPU' && '💻'}
                              {item.type === 'GPU' && '🎮'}
                              {item.type === 'Badge' && '🏆'}
                            </span>
                            <span className="text-white text-sm">{item.name}</span>
                          </div>
                          <span className="text-mining-primary font-medium">
                            {item.type === 'Badge' ? '42' : item.type === 'GPU' ? '11-18' : item.type === 'CPU' ? '9' : '1'} weight
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer info */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>WATTx Mining Game - Build your rig, stake NFTs, earn rewards</p>
          <p className="mt-1">
            Components from{' '}
            <a
              href="https://mining.game"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mining-primary hover:underline"
            >
              Mining.Game
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
