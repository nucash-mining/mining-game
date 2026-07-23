import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, GAME_ITEMS } from '../utils/constants';
import { NFT_STAKING_ABI, MINING_GAME_ABI } from '../utils/contractABI';

export function useStaking(provider, signer, account, chainId) {
  const [stakedNFTs, setStakedNFTs] = useState([]);
  const [pendingRewards, setPendingRewards] = useState({ earned: 0n, released: 0n });
  const [isLoading, setIsLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [error, setError] = useState(null);

  const getContractAddresses = useCallback(() => {
    if (chainId === 137) {
      return {
        staking: CONTRACTS.polygon.nftStaking,
        nft: CONTRACTS.polygon.miningGame,
      };
    }
    if (chainId === 2330) {
      return {
        staking: CONTRACTS.altcoinchain.nftStaking,
        nft: CONTRACTS.altcoinchain.miningGame,
      };
    }
    return null;
  }, [chainId]);

  // Fetch staked NFTs and rewards
  const fetchStakingData = useCallback(async () => {
    if (!provider || !account) {
      setStakedNFTs([]);
      setPendingRewards({ earned: 0n, released: 0n });
      return;
    }

    const addresses = getContractAddresses();
    if (!addresses) return;

    setIsLoading(true);
    setError(null);

    try {
      const stakingContract = new ethers.Contract(
        addresses.staking,
        NFT_STAKING_ABI,
        provider
      );

      // Get all staked deposits for this wallet
      const deposits = await stakingContract.getActivityLogs(account);

      // Filter active deposits and enrich with item data
      const activeDeposits = deposits
        .filter(d => d.isActive)
        .map(deposit => {
          const itemData = GAME_ITEMS[Number(deposit.tokenId)] || {};
          return {
            depositId: Number(deposit.id),
            tokenId: Number(deposit.tokenId),
            amount: Number(deposit.amount),
            startTime: Number(deposit.startTime),
            endTime: Number(deposit.endTime),
            stakeWeight: Number(deposit.stakeWeight),
            isActive: deposit.isActive,
            ...itemData,
          };
        });

      setStakedNFTs(activeDeposits);

      // Get total pending rewards
      const rewards = await stakingContract.getAllRewardsAmount(account);
      setPendingRewards({
        earned: rewards.earnedRewards,
        released: rewards.releasedRewards,
      });

      // Check if NFT contract is approved for staking
      const nftContract = new ethers.Contract(
        addresses.nft,
        MINING_GAME_ABI,
        provider
      );
      const approved = await nftContract.isApprovedForAll(account, addresses.staking);
      setIsApproved(approved);

    } catch (err) {
      console.error('Error fetching staking data:', err);
      setError('Failed to fetch staking data');
    } finally {
      setIsLoading(false);
    }
  }, [provider, account, getContractAddresses]);

  // Approve staking contract to transfer NFTs
  const approveStaking = useCallback(async () => {
    if (!signer || !account) return false;

    const addresses = getContractAddresses();
    if (!addresses) return false;

    try {
      const nftContract = new ethers.Contract(
        addresses.nft,
        MINING_GAME_ABI,
        signer
      );

      const tx = await nftContract.setApprovalForAll(addresses.staking, true);
      await tx.wait();

      setIsApproved(true);
      return true;
    } catch (err) {
      console.error('Error approving staking:', err);
      throw err;
    }
  }, [signer, account, getContractAddresses]);

  // Stake NFTs
  const stakeNFT = useCallback(async (tokenId, amount = 1) => {
    if (!signer || !account) return false;

    const addresses = getContractAddresses();
    if (!addresses) return false;

    try {
      const stakingContract = new ethers.Contract(
        addresses.staking,
        NFT_STAKING_ABI,
        signer
      );

      const tx = await stakingContract.stake(tokenId, amount);
      await tx.wait();

      // Refresh data
      await fetchStakingData();
      return true;
    } catch (err) {
      console.error('Error staking NFT:', err);
      throw err;
    }
  }, [signer, account, getContractAddresses, fetchStakingData]);

  // Stake multiple NFTs
  const stakeBatch = useCallback(async (tokenIds, amounts) => {
    if (!signer || !account) return false;

    const addresses = getContractAddresses();
    if (!addresses) return false;

    try {
      const stakingContract = new ethers.Contract(
        addresses.staking,
        NFT_STAKING_ABI,
        signer
      );

      const tx = await stakingContract.stakeBatch(tokenIds, amounts);
      await tx.wait();

      await fetchStakingData();
      return true;
    } catch (err) {
      console.error('Error batch staking:', err);
      throw err;
    }
  }, [signer, account, getContractAddresses, fetchStakingData]);

  // Unstake NFT
  const unstakeNFT = useCallback(async (depositId) => {
    if (!signer || !account) return false;

    const addresses = getContractAddresses();
    if (!addresses) return false;

    try {
      const stakingContract = new ethers.Contract(
        addresses.staking,
        NFT_STAKING_ABI,
        signer
      );

      const tx = await stakingContract.unstake(depositId);
      await tx.wait();

      await fetchStakingData();
      return true;
    } catch (err) {
      console.error('Error unstaking NFT:', err);
      throw err;
    }
  }, [signer, account, getContractAddresses, fetchStakingData]);

  // Unstake all NFTs
  const unstakeAll = useCallback(async () => {
    if (!signer || !account) return false;

    const addresses = getContractAddresses();
    if (!addresses) return false;

    try {
      const stakingContract = new ethers.Contract(
        addresses.staking,
        NFT_STAKING_ABI,
        signer
      );

      const tx = await stakingContract.unstakeAll();
      await tx.wait();

      await fetchStakingData();
      return true;
    } catch (err) {
      console.error('Error unstaking all:', err);
      throw err;
    }
  }, [signer, account, getContractAddresses, fetchStakingData]);

  // Claim rewards for specific deposit
  const claimRewards = useCallback(async (depositId) => {
    if (!signer || !account) return false;

    const addresses = getContractAddresses();
    if (!addresses) return false;

    try {
      const stakingContract = new ethers.Contract(
        addresses.staking,
        NFT_STAKING_ABI,
        signer
      );

      const tx = await stakingContract.withdrawRewards(depositId);
      await tx.wait();

      await fetchStakingData();
      return true;
    } catch (err) {
      console.error('Error claiming rewards:', err);
      throw err;
    }
  }, [signer, account, getContractAddresses, fetchStakingData]);

  // Claim all rewards
  const claimAllRewards = useCallback(async () => {
    if (!signer || !account) return false;

    const addresses = getContractAddresses();
    if (!addresses) return false;

    try {
      const stakingContract = new ethers.Contract(
        addresses.staking,
        NFT_STAKING_ABI,
        signer
      );

      const tx = await stakingContract.withdrawAllRewards();
      await tx.wait();

      await fetchStakingData();
      return true;
    } catch (err) {
      console.error('Error claiming all rewards:', err);
      throw err;
    }
  }, [signer, account, getContractAddresses, fetchStakingData]);

  // Fetch data when account or chain changes
  useEffect(() => {
    fetchStakingData();
  }, [fetchStakingData]);

  return {
    stakedNFTs,
    pendingRewards,
    isLoading,
    isApproved,
    error,
    refetch: fetchStakingData,
    approveStaking,
    stakeNFT,
    stakeBatch,
    unstakeNFT,
    unstakeAll,
    claimRewards,
    claimAllRewards,
  };
}
