// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/**
 * @notice Deposit Guard: SancaPool uses this for deposit/withdraw (single-asset → vault).
 *        Testnet: MockDepositGuard. Mainnet: ICHIVaultDepositGuard.
 */
interface IDepositGuard {
    function deposit(
        address vault,
        address token,
        uint256 amount,
        uint256 minProceeds,
        address to
    ) external returns (uint256 vaultTokens);

    function withdraw(
        address vault,
        uint256 shares,
        address to,
        uint256 minAmount0,
        uint256 minAmount1
    ) external returns (uint256 amount0, uint256 amount1);
}
