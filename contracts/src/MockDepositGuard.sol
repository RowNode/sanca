// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IBonzoVault.sol";
import "./interfaces/IDepositGuard.sol";

/**
 * @title MockDepositGuard
 * @notice Testnet guard: forwards deposit/withdraw to MockBonzoVault. SancaPool talks to this, not vault directly.
 */
contract MockDepositGuard is IDepositGuard {
    function deposit(
        address vault,
        address token,
        uint256 amount,
        uint256 minProceeds,
        address to
    ) external override returns (uint256 vaultTokens) {
        require(vault != address(0) && token != address(0), "MockDepositGuard: zero address");
        require(IBonzoVault(vault).token0() == token, "MockDepositGuard: token must be token0");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        IERC20(token).approve(vault, amount);
        vaultTokens = IBonzoVault(vault).deposit(amount, 0, to);
        require(vaultTokens >= minProceeds, "MockDepositGuard: minProceeds");
    }

    function withdraw(
        address vault,
        uint256 shares,
        address to,
        uint256 minAmount0,
        uint256 minAmount1
    ) external override returns (uint256 amount0, uint256 amount1) {
        require(vault != address(0), "MockDepositGuard: zero vault");
        IERC20(vault).transferFrom(msg.sender, address(this), shares);
        (amount0, amount1) = IBonzoVault(vault).withdraw(shares, to);
        require(amount0 >= minAmount0 && amount1 >= minAmount1, "MockDepositGuard: min amounts");
    }
}
