import React, { useState } from 'react';
import { ethers } from 'ethers';
import { RARITY_COLORS, GAME_ITEMS } from '../utils/constants';

export default function StakingPanel({
  inventory,
  stakedNFTs,
  pendingRewards,
  isApproved,
  isLoading,
  onApprove,
  onStake,
  onUnstake,
  onUnstakeAll,
  onClaimRewards,
  onClaimAllRewards,
}) {
  const [selectedForStaking, setSelectedForStaking] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Format rewards (assuming 18 decimals)
  const formatRewards = (value) => {
    if (!value) return '0';
    try {
      return parseFloat(ethers.formatEther(value)).toFixed(4);
    } catch {
      return '0';
    }
  };

  // Calculate time remaining for unstake
  const getTimeRemaining = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;
    if (remaining <= 0) return 'Ready';

    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const mins = Math.floor((remaining % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Toggle NFT selection for staking
  const toggleSelection = (item) => {
    setSelectedForStaking(prev => {
      const exists = prev.find(s => s.id === item.id);
      if (exists) {
        return prev.filter(s => s.id !== item.id);
      }
      return [...prev, { id: item.id, amount: 1 }];
    });
  };

  // Handle stake action
  const handleStake = async () => {
    if (selectedForStaking.length === 0) return;

    setIsProcessing(true);
    try {
      for (const item of selectedForStaking) {
        await onStake(item.id, item.amount);
      }
      setSelectedForStaking([]);
    } catch (err) {
      console.error('Staking failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle unstake action
  const handleUnstake = async (depositId) => {
    setIsProcessing(true);
    try {
      await onUnstake(depositId);
    } catch (err) {
      console.error('Unstake failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle claim all rewards
  const handleClaimAll = async () => {
    setIsProcessing(true);
    try {
      await onClaimAllRewards();
    } catch (err) {
      console.error('Claim failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get stakeable NFTs (not already staked)
  const stakeableNFTs = inventory.filter(item => item.balance > 0);

  // Calculate total staked value
  const totalStaked = stakedNFTs.reduce((sum, nft) => sum + nft.amount, 0);
  const totalStakeWeight = stakedNFTs.reduce((sum, nft) => sum + (nft.stakeWeight || 0), 0);

  return (
    <div className="space-y-6">
      {/* Rewards Summary Card */}
      <div className="card-dark p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">💎</span>
          Staking Rewards
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-mining-primary/20 to-mining-primary/5 border border-mining-primary/30">
            <p className="text-sm text-gray-400 mb-1">Pending Rewards</p>
            <p className="text-2xl font-bold text-mining-primary">
              {formatRewards(pendingRewards.earned - pendingRewards.released)} WATT
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-mining-accent/20 to-mining-accent/5 border border-mining-accent/30">
            <p className="text-sm text-gray-400 mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-mining-accent">
              {formatRewards(pendingRewards.earned)} WATT
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-[#1a1a2e]">
            <p className="text-xs text-gray-500">NFTs Staked</p>
            <p className="text-lg font-semibold text-white">{totalStaked}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#1a1a2e]">
            <p className="text-xs text-gray-500">Total Stake Weight</p>
            <p className="text-lg font-semibold text-white">{totalStakeWeight}</p>
          </div>
        </div>

        {pendingRewards.earned > pendingRewards.released && (
          <button
            onClick={handleClaimAll}
            disabled={isProcessing}
            className="w-full btn-primary py-3 bg-gradient-to-r from-mining-primary to-mining-accent"
          >
            {isProcessing ? 'Processing...' : 'Claim All Rewards'}
          </button>
        )}
      </div>

      {/* Currently Staked */}
      <div className="card-dark p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">🔒</span>
          Currently Staked
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-mining-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stakedNFTs.length > 0 ? (
          <div className="space-y-3">
            {stakedNFTs.map((nft) => {
              const rarityColor = RARITY_COLORS[nft.rarity] || RARITY_COLORS.common;
              const canUnstake = nft.endTime <= Math.floor(Date.now() / 1000);

              return (
                <div
                  key={nft.depositId}
                  className="p-4 rounded-xl border transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${rarityColor}10, transparent)`,
                    borderColor: `${rarityColor}40`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${rarityColor}20` }}
                      >
                        {nft.type === 'PC' && '🖥️'}
                        {nft.type === 'CPU' && '💻'}
                        {nft.type === 'GPU' && '🎮'}
                        {nft.type === 'Badge' && '🏆'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{nft.name}</h4>
                        <div className="flex items-center gap-2 text-xs">
                          <span style={{ color: rarityColor }} className="capitalize">
                            {nft.rarity}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">x{nft.amount}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-mining-primary">Weight: {nft.stakeWeight}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Unlock Time</p>
                        <p className={`text-sm font-medium ${canUnstake ? 'text-green-400' : 'text-mining-warning'}`}>
                          {getTimeRemaining(nft.endTime)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnstake(nft.depositId)}
                        disabled={isProcessing || !canUnstake}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          canUnstake
                            ? 'bg-mining-danger hover:bg-mining-danger/80 text-white'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Unstake
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {stakedNFTs.length > 1 && (
              <button
                onClick={onUnstakeAll}
                disabled={isProcessing}
                className="w-full py-2 text-sm text-mining-danger hover:text-red-400 transition-colors"
              >
                Unstake All
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <p>No NFTs currently staked</p>
          </div>
        )}
      </div>

      {/* Stake New NFTs */}
      <div className="card-dark p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">➕</span>
          Stake NFTs
        </h3>

        {!isApproved ? (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">
              Approve the staking contract to stake your NFTs
            </p>
            <button
              onClick={onApprove}
              disabled={isProcessing}
              className="btn-primary px-8 py-3"
            >
              {isProcessing ? 'Approving...' : 'Approve Staking'}
            </button>
          </div>
        ) : stakeableNFTs.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {stakeableNFTs.map((item) => {
                const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
                const isSelected = selectedForStaking.some(s => s.id === item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelection(item)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-mining-primary bg-mining-primary/10 scale-[1.02]'
                        : 'border-gray-700 bg-[#1a1a2e] hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: `${rarityColor}20` }}
                      >
                        {item.type === 'PC' && '🖥️'}
                        {item.type === 'CPU' && '💻'}
                        {item.type === 'GPU' && '🎮'}
                        {item.type === 'Badge' && '🏆'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">{item.name}</h4>
                        <p className="text-xs text-gray-500">x{item.balance} available</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center justify-center">
                        <span className="text-xs text-mining-primary font-medium">
                          ✓ Selected
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleStake}
              disabled={isProcessing || selectedForStaking.length === 0}
              className={`w-full py-3 rounded-xl font-medium transition-all ${
                selectedForStaking.length > 0
                  ? 'bg-gradient-to-r from-mining-primary to-mining-secondary text-white hover:opacity-90'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isProcessing
                ? 'Staking...'
                : selectedForStaking.length > 0
                  ? `Stake ${selectedForStaking.length} NFT${selectedForStaking.length > 1 ? 's' : ''}`
                  : 'Select NFTs to Stake'}
            </button>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>No NFTs available to stake</p>
          </div>
        )}
      </div>
    </div>
  );
}
