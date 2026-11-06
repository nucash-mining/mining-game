// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Min {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title MockStakers
 * @dev Minimal stand-in for WattStakingPool.fund(amount): pulls `amount` WATT
 *      from the caller (who must have approved this contract) and tallies it.
 *      Mirrors how the real pool's fund() consumes an approval.
 */
contract MockStakers {
    IERC20Min public immutable watt;
    uint256 public totalFunded;

    constructor(address _watt) { watt = IERC20Min(_watt); }

    function fund(uint256 amount) external {
        require(watt.transferFrom(msg.sender, address(this), amount), "fund transferFrom");
        totalFunded += amount;
    }
}
