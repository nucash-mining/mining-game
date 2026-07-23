// MiningGame ERC1155 Contract ABI (actual from Polygon)
export const MINING_GAME_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256[]","name":"ids","type":"uint256[]"},{"indexed":false,"internalType":"uint256[]","name":"values","type":"uint256[]"}],"name":"TransferBatch","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"TransferSingle","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"value","type":"string"},{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"URI","type":"event"},
  {"inputs":[{"internalType":"uint256","name":"newsupplies","type":"uint256"},{"internalType":"uint256","name":"newminted","type":"uint256"},{"internalType":"uint256","name":"newrate","type":"uint256"},{"internalType":"uint256","name":"newspecs","type":"uint256"}],"name":"AddItem","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"_specs","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"id","type":"uint256"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address[]","name":"accounts","type":"address[]"},{"internalType":"uint256[]","name":"ids","type":"uint256[]"}],"name":"balanceOfBatch","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256[]","name":"ids","type":"uint256[]"},{"internalType":"uint256[]","name":"values","type":"uint256[]"}],"name":"burnBatch","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"contractURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"exists","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"freemint","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"minted","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256[]","name":"ids","type":"uint256[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"name":"ownerBatch","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ownermint","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"rates","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256[]","name":"ids","type":"uint256[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"safeBatchTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"},{"internalType":"string","name":"_uri","type":"string"}],"name":"setURI","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"specs","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"supplies","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"uri","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

// MiningEngine Contract ABI (for rig deployment)
export const MINING_ENGINE_ABI = [
  'function startMining(address nftContract, uint256 rigId, uint256 wattAmount)',
  'function stopMining(address nftContract, uint256 rigId)',
  'function claimRewards(address nftContract, uint256 rigId)',
  'function depositWatt(address nftContract, uint256 rigId, uint256 amount)',
  'function getPendingRewards(uint256 rigId) view returns (uint256)',
  'function getRemainingWatt(address nftContract, uint256 rigId) view returns (uint256)',
  'function getEstimatedRuntime(address nftContract, uint256 rigId) view returns (uint256)',
  'function sessions(bytes32) view returns (address owner, uint256 rigId, uint256 startTime, uint256 lastClaimTime, uint256 wattDeposited, uint256 totalEarned, bool active)',
];

// WATT Token ABI
export const WATT_TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
];

// NFT Staking Contract ABI
export const NFT_STAKING_ABI = [
  // Staking functions
  'function stake(uint256 tokenId, uint256 amount) external',
  'function stakeBatch(uint256[] memory tokenIds, uint256[] memory amounts) external',
  'function unstake(uint256 depositId) external',
  'function unstakeAll() external',
  'function emergencyUnstake(uint256 depositId) external',

  // Reward functions
  'function withdrawRewards(uint256 depositId) external',
  'function withdrawAllRewards() external',
  'function getRewardsAmount(uint256 depositId) external view returns (uint256 pendingRewards, uint256 claimedRewards)',
  'function getAllRewardsAmount(address _stakerAddress) external view returns (uint256 earnedRewards, uint256 releasedRewards)',

  // View functions
  'function getActivityLogs(address _walletAddress) external view returns (tuple(uint256 id, address wallet, uint256 tokenId, uint256 amount, uint256 startTime, uint256 endTime, uint256 stakeWeight, bool isActive)[])',
  'function nftDeposits(uint256) external view returns (uint256 id, address wallet, uint256 tokenId, uint256 amount, uint256 startTime, uint256 endTime, uint256 stakeWeight, bool isActive)',
  'function stakedTotal() external view returns (uint256)',
  'function canDeposit(uint256 tokenId) external view returns (bool)',
  'function stakeWeight(uint256 tokenId) external view returns (uint256)',
  'function minimumStakingTime(uint256 tokenId) external view returns (uint256)',
  'function rewardsTokenAmount() external view returns (uint256)',

  // Events
  'event Staked(address indexed user, uint256 indexed tokenId, uint256 amount, uint256 depositId)',
  'event Unstaked(address indexed user, uint256 indexed depositId, uint256 reward)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
];

// Mining Rig NFT ABI
export const MINING_RIG_NFT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function getRigTraits(uint256 tokenId) view returns (tuple(uint16 hashRate, uint8 algorithm, uint8 efficiency, uint16 wattConsumption, uint8 rarity, uint8 cooling, uint8 durability))',
  'function getEffectivePower(uint256 tokenId) view returns (uint256)',
  'function getWattPerHour(uint256 tokenId) view returns (uint256)',
  'function getStakeWeight(uint256 tokenId) view returns (uint256)',
  'function isStaked(uint256 tokenId) view returns (bool)',
  'function isMining(uint256 tokenId) view returns (bool)',
  'function approve(address to, uint256 tokenId)',
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
];
