// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IWATT
 * @dev Interface for the WATT token (electricity token for mining game)
 *
 * Already Deployed:
 * - Polygon: 0xE960d5076cd3169C343Ee287A2c3380A222e5839
 * - Altcoinchain: 0x6645143e49B3a15d8F205658903a55E520444698
 */
interface IWATT {
    // ERC20 standard functions
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
