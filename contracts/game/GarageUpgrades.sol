// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * GarageUpgrades — on-chain persistence for The Mining Game's garage add-ons.
 *
 * WHY THIS EXISTS
 * ---------------
 * In LIVE mode the farm (rigs, components, badge, tower) is rebuilt from the
 * player's wallet on every sync, so it always comes back. The garage add-ons —
 * Power Grid, Cooling, Garage Expansion, Rack Expansion — were the exception:
 * they were paid for with real WATT, but the resulting LEVEL was only ever kept
 * in the browser's localStorage. Clear the cache / change device / a failed
 * write, and the add-ons reset to 0 while the chain-backed farm survived. This
 * contract gives those levels a real on-chain home keyed by wallet address, so
 * they persist exactly like the NFTs do.
 *
 * ECONOMY (unchanged)
 * -------------------
 * Every WATT spent here is forwarded into the SAME WattStakingPool the game
 * already funds, via fund(amount) — so stakers keep earning on garage spend,
 * exactly as before. Two spend paths, both faithful to the old flow:
 *   - topUp(whole): one signed transfer loads prepaid CREDIT (recorded on-chain)
 *     and funds the stakers pool now. Later upgrades spend that credit with a
 *     cheap tx and no token transfer.
 *   - buyUpgrade(kind): if credit covers the price it is spent from credit;
 *     otherwise the exact price is pulled from the wallet and funded to stakers.
 * Either way the new level is written on-chain and read back by the game.
 *
 * Prices mirror CFG.upPrice / CFG.upGrowth in the game (whole WATT, 18-dec token).
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

/// WattStakingPool V1: distributes ONLY what arrives through fund() (pro-rata).
interface IWattStakingPool {
    function fund(uint256 amount) external;
}

contract GarageUpgrades {
    // ---- upgrade kinds (must match the game's mapping) ----
    uint8 public constant POWER   = 0;
    uint8 public constant COOLING = 1;
    uint8 public constant RACK    = 2;
    uint8 public constant RACKGPU = 3;

    IERC20 public immutable watt;             // WATT v2 token (economy.wattV2)
    IWattStakingPool public immutable stakers; // WattStakingPool (economy.stakingPool)

    address public owner; // may restore levels for players who paid before this contract existed

    /// per-wallet upgrade level, by kind
    mapping(address => mapping(uint8 => uint32)) public levelOf;
    /// per-wallet prepaid WATT credit, in wei (18 decimals)
    mapping(address => uint256) public creditOf;

    event ToppedUp(address indexed user, uint256 amount, uint256 newCredit);
    event Upgraded(address indexed user, uint8 indexed kind, uint32 newLevel, uint256 cost, bool fromCredit);
    event Restored(address indexed user, uint32 power, uint32 cooling, uint32 rack, uint32 rackgpu);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    constructor(address _watt, address _stakers) {
        require(_watt != address(0) && _stakers != address(0), "zero addr");
        watt = IERC20(_watt);
        stakers = IWattStakingPool(_stakers);
        owner = msg.sender;
        emit OwnerChanged(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function renounceOwnership() external onlyOwner {
        emit OwnerChanged(owner, address(0));
        owner = address(0);
    }

    // ---------------------------------------------------------------
    // Price ladders — WHOLE WATT (multiply by 1e18 for the token amount).
    // Finite ladders (rack, rackgpu) have a hard max; power/cooling grow by
    // x2.25 (=x9/4) per level past the table, forever.
    // ---------------------------------------------------------------
    function _powerTable(uint256 i) private pure returns (uint256) {
        uint32[16] memory t = [
            uint32(400),1100,2600,6000,14000,32000,70000,160000,
            368000,850000,1950000,4500000,10000000,24000000,55000000,125000000
        ];
        return t[i];
    }
    function _coolingTable(uint256 i) private pure returns (uint256) {
        uint32[16] memory t = [
            uint32(350),900,2200,5200,12000,28000,60000,130000,
            300000,700000,1600000,3700000,8500000,20000000,45000000,100000000
        ];
        return t[i];
    }
    function _rackTable(uint256 i) private pure returns (uint256) {
        uint32[2] memory t = [uint32(1500),9000];
        return t[i];
    }
    function _rackgpuTable(uint256 i) private pure returns (uint256) {
        uint32[5] memory t = [uint32(12000),30000,75000,180000,420000];
        return t[i];
    }

    uint256 private constant POWER_LEN   = 16;
    uint256 private constant COOLING_LEN = 16;
    uint256 private constant RACK_LEN    = 2;
    uint256 private constant RACKGPU_LEN = 5;

    /// Max buyable level for a kind. 0 == unbounded (power/cooling).
    function maxLevel(uint8 kind) public pure returns (uint32) {
        if (kind == POWER || kind == COOLING) return 0;      // unbounded
        if (kind == RACK)    return uint32(RACK_LEN);
        if (kind == RACKGPU) return uint32(RACKGPU_LEN);
        revert("bad kind");
    }

    /// Price in WHOLE WATT to buy the upgrade that takes `kind` from `lv` to `lv+1`.
    function priceWhole(uint8 kind, uint32 lv) public pure returns (uint256) {
        if (kind == POWER)   return _openLadder(_powerTableLast(), POWER_LEN, lv, _powerTable);
        if (kind == COOLING) return _openLadder(_coolingTableLast(), COOLING_LEN, lv, _coolingTable);
        if (kind == RACK)    { require(lv < RACK_LEN, "maxed");    return _rackTable(lv); }
        if (kind == RACKGPU) { require(lv < RACKGPU_LEN, "maxed"); return _rackgpuTable(lv); }
        revert("bad kind");
    }

    function _powerTableLast() private pure returns (uint256)   { return _powerTable(POWER_LEN - 1); }
    function _coolingTableLast() private pure returns (uint256) { return _coolingTable(COOLING_LEN - 1); }

    /// power/cooling: in-table lookup, else last-entry * (9/4)^(lv-len+1).
    function _openLadder(
        uint256 last,
        uint256 len,
        uint32 lv,
        function(uint256) pure returns (uint256) table
    ) private pure returns (uint256) {
        if (lv < len) return table(lv);
        uint256 v = last;
        uint256 steps = uint256(lv) - (len - 1); // matches JS: lv-arr.length+1
        for (uint256 i = 0; i < steps; i++) {
            v = (v * 9) / 4; // x2.25 per level
        }
        return v;
    }

    /// Token cost (wei) to take `kind` from its CURRENT level for `user` to +1.
    function costOf(address user, uint8 kind) public view returns (uint256) {
        return priceWhole(kind, levelOf[user][kind]) * 1e18;
    }

    // ---------------------------------------------------------------
    // Spend paths
    // ---------------------------------------------------------------

    /// Load prepaid credit: funds the stakers pool now, records credit on-chain.
    /// `amountWhole` is in WHOLE WATT (e.g. 5000). Requires a prior WATT approval
    /// to this contract for amountWhole*1e18.
    function topUp(uint256 amountWhole) external {
        require(amountWhole > 0, "zero");
        uint256 amt = amountWhole * 1e18;
        _pullAndFund(msg.sender, amt);
        uint256 nc = creditOf[msg.sender] + amt;
        creditOf[msg.sender] = nc;
        emit ToppedUp(msg.sender, amt, nc);
    }

    /// Buy one level of `kind`. Spends prepaid credit if it covers the price,
    /// otherwise pulls the exact price from the wallet and funds stakers.
    /// On the wallet-pay path, requires a WATT approval to this contract.
    function buyUpgrade(uint8 kind) external {
        uint32 lv = levelOf[msg.sender][kind];
        uint32 mx = maxLevel(kind);
        require(mx == 0 || lv < mx, "maxed");

        uint256 cost = priceWhole(kind, lv) * 1e18;
        bool fromCredit;
        uint256 cr = creditOf[msg.sender];
        if (cr >= cost) {
            creditOf[msg.sender] = cr - cost; // WATT already funded at top-up time
            fromCredit = true;
        } else {
            _pullAndFund(msg.sender, cost);   // pull exact price, forward to stakers
        }

        uint32 nl = lv + 1;
        levelOf[msg.sender][kind] = nl;
        emit Upgraded(msg.sender, kind, nl, cost, fromCredit);
    }

    // ---------------------------------------------------------------
    // Owner restore — for players who paid for add-ons BEFORE this contract
    // existed (their levels lived only in localStorage and were lost). This
    // grants levels WITHOUT charging WATT again, since they already paid. It is
    // a floor, not a reset: it never lowers a level a player already holds here,
    // so running a restore twice is safe and can't erase on-chain purchases.
    // ---------------------------------------------------------------
    function restoreLevels(
        address user,
        uint32 power,
        uint32 cooling,
        uint32 rack,
        uint32 rackgpu
    ) public onlyOwner {
        require(user != address(0), "zero addr");
        require(rack <= RACK_LEN && rackgpu <= RACKGPU_LEN, "over max");
        _raise(user, POWER, power);
        _raise(user, COOLING, cooling);
        _raise(user, RACK, rack);
        _raise(user, RACKGPU, rackgpu);
        emit Restored(user, levelOf[user][POWER], levelOf[user][COOLING], levelOf[user][RACK], levelOf[user][RACKGPU]);
    }

    /// Restore many players at once (parallel arrays).
    function restoreLevelsMany(
        address[] calldata users,
        uint32[] calldata power,
        uint32[] calldata cooling,
        uint32[] calldata rack,
        uint32[] calldata rackgpu
    ) external onlyOwner {
        uint256 n = users.length;
        require(
            power.length == n && cooling.length == n && rack.length == n && rackgpu.length == n,
            "length mismatch"
        );
        for (uint256 i = 0; i < n; i++) {
            restoreLevels(users[i], power[i], cooling[i], rack[i], rackgpu[i]);
        }
    }

    /// Owner may also grant prepaid credit (e.g. to compensate lost game credit).
    function grantCredit(address user, uint256 amountWhole) external onlyOwner {
        creditOf[user] += amountWhole * 1e18;
        emit ToppedUp(user, amountWhole * 1e18, creditOf[user]);
    }

    function _raise(address user, uint8 kind, uint32 toLevel) private {
        if (toLevel > levelOf[user][kind]) levelOf[user][kind] = toLevel;
    }

    /// Pull `amt` WATT from `from` and forward it into the stakers pool the
    /// counted way (approve + fund). Reverts unless the full amount moves.
    function _pullAndFund(address from, uint256 amt) private {
        _safeTransferFrom(from, address(this), amt);
        _safeApprove(address(stakers), amt);
        stakers.fund(amt);
    }

    // ---------------------------------------------------------------
    // Read-back: one call returns everything the game needs to restore S.
    // ---------------------------------------------------------------
    function garageState(address user)
        external
        view
        returns (uint32 power, uint32 cooling, uint32 rack, uint32 rackgpu, uint256 credit)
    {
        power   = levelOf[user][POWER];
        cooling = levelOf[user][COOLING];
        rack    = levelOf[user][RACK];
        rackgpu = levelOf[user][RACKGPU];
        credit  = creditOf[user];
    }

    // ---------------------------------------------------------------
    // Minimal SafeERC20 (tolerates tokens that return nothing on success).
    // ---------------------------------------------------------------
    function _safeTransferFrom(address from, address to, uint256 amt) private {
        (bool ok, bytes memory data) = address(watt).call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amt)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "WATT transferFrom failed");
    }
    function _safeApprove(address spender, uint256 amt) private {
        (bool ok, bytes memory data) = address(watt).call(
            abi.encodeWithSelector(IERC20.approve.selector, spender, amt)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "WATT approve failed");
    }
}
