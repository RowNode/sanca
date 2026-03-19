// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/**
 * @notice Vault interface aligned with ICHIVault for testnet/mainnet compatibility.
 *        SancaPool uses Deposit Guard for deposit/withdraw; keeper uses this for rebalance/collectFees.
 */
interface IBonzoVault {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function currentTick() external view returns (int24);

    /// @dev Single-asset: pass (amount, 0) or (0, amount) depending on allowToken0/allowToken1
    function deposit(uint256 deposit0, uint256 deposit1, address to) external returns (uint256 shares);

    /// @dev Returns (amount0, amount1) for this vault's tokens
    function withdraw(uint256 shares, address to) external returns (uint256 amount0, uint256 amount1);

    function getTotalAmounts() external view returns (uint256 total0, uint256 total1);

    /// @dev For backward compat / yield math: total0 + total1 in token1 terms or use getTotalAmounts
    function totalAssets() external view returns (uint256);

    function rebalance(
        int24 baseLower,
        int24 baseUpper,
        int24 limitLower,
        int24 limitUpper,
        int256 swapQuantity
    ) external;

    function collectFees() external returns (uint256 fees0, uint256 fees1);
}
