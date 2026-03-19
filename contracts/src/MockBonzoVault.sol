// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IBonzoVault.sol";

/**
 * @title MockBonzoVault
 * @notice Bonzo-like testnet vault with share-based accounting, parameterized rebalance,
 *         and mock fee/yield mechanics for MVP demos.
 */
contract MockBonzoVault is ERC20, Ownable, IBonzoVault {
    using SafeERC20 for IERC20;

    address public immutable override token0;
    address public immutable override token1; // address(0) = single-asset MVP

    bool public immutable allowToken0 = true;
    bool public immutable allowToken1 = false;
    uint24 public immutable fee = 3000;
    int24 public immutable tickSpacing = 60;

    int24 public override currentTick;
    int24 public baseLower;
    int24 public baseUpper;
    int24 public limitLower;
    int24 public limitUpper;

    uint256 public managedAssets;
    uint256 public pendingFeeAssets;
    uint256 public lastRebalanceAt;
    int256 public lastSwapQuantity;
    uint256 public rebalanceCount;

    event DepositProcessed(address indexed caller, address indexed to, uint256 assets, uint256 shares);
    event WithdrawProcessed(address indexed caller, address indexed to, uint256 shares, uint256 amount0);
    event FeesSeeded(uint256 amount);
    event YieldSimulated(uint256 amount);
    event FeesCollected(address indexed caller, uint256 fees0, uint256 fees1);
    event Rebalanced(
        int24 currentTick,
        int24 baseLower,
        int24 baseUpper,
        int24 limitLower,
        int24 limitUpper,
        int256 swapQuantity
    );
    event CurrentTickUpdated(int24 tick);

    constructor(address _asset) ERC20("Mock Bonzo Shares", "mbSHARE") Ownable(msg.sender) {
        token0 = _asset;
        token1 = address(0);
        currentTick = 0;
        baseLower = -120;
        baseUpper = 120;
        limitLower = -480;
        limitUpper = 480;
    }

    function deposit(uint256 deposit0, uint256 deposit1, address to) external override returns (uint256 shares) {
        require(to != address(0), "MockBonzoVault: invalid receiver");
        require(deposit0 > 0, "MockBonzoVault: zero deposit");
        require(deposit1 == 0, "MockBonzoVault: single asset only");

        uint256 currentAssets = managedAssets;
        uint256 supply = totalSupply();

        IERC20(token0).safeTransferFrom(msg.sender, address(this), deposit0);

        managedAssets += deposit0;
        shares = supply == 0 || currentAssets == 0
            ? deposit0
            : (deposit0 * supply) / currentAssets;
        require(shares > 0, "MockBonzoVault: zero shares");
        _mint(to, shares);

        emit DepositProcessed(msg.sender, to, deposit0, shares);
    }

    function withdraw(uint256 shares, address to) external override returns (uint256 amount0, uint256 amount1) {
        require(to != address(0), "MockBonzoVault: invalid receiver");
        require(shares > 0, "MockBonzoVault: zero shares");

        uint256 supply = totalSupply();
        require(supply > 0, "MockBonzoVault: no supply");

        amount0 = (shares * managedAssets) / supply;
        amount1 = 0;

        _burn(msg.sender, shares);

        if (amount0 > managedAssets) {
            amount0 = managedAssets;
        }

        managedAssets -= amount0;

        uint256 liquidBalance = IERC20(token0).balanceOf(address(this));
        require(liquidBalance >= amount0, "MockBonzoVault: insufficient liquidity");
        if (amount0 > 0) IERC20(token0).safeTransfer(to, amount0);

        emit WithdrawProcessed(msg.sender, to, shares, amount0);
    }

    function getTotalAmounts() external view override returns (uint256 total0, uint256 total1) {
        total0 = managedAssets;
        total1 = 0;
    }

    function totalAssets() external view override returns (uint256) {
        return managedAssets;
    }

    function simulateYield(uint256 amount) external onlyOwner {
        require(amount > 0, "MockBonzoVault: zero amount");
        _fundVault(amount);
        managedAssets += amount;
        emit YieldSimulated(amount);
    }

    function seedPendingFees(uint256 amount) external onlyOwner {
        require(amount > 0, "MockBonzoVault: zero amount");
        _fundVault(amount);
        pendingFeeAssets += amount;
        emit FeesSeeded(amount);
    }

    function setCurrentTick(int24 nextTick) external onlyOwner {
        currentTick = nextTick;
        emit CurrentTickUpdated(nextTick);
    }

    function rebalance(
        int24 nextBaseLower,
        int24 nextBaseUpper,
        int24 nextLimitLower,
        int24 nextLimitUpper,
        int256 swapQuantity
    ) external override {
        _validateRange(nextBaseLower, nextBaseUpper);
        _validateRange(nextLimitLower, nextLimitUpper);

        baseLower = nextBaseLower;
        baseUpper = nextBaseUpper;
        limitLower = nextLimitLower;
        limitUpper = nextLimitUpper;
        lastSwapQuantity = swapQuantity;
        lastRebalanceAt = block.timestamp;
        rebalanceCount += 1;

        emit Rebalanced(
            currentTick,
            nextBaseLower,
            nextBaseUpper,
            nextLimitLower,
            nextLimitUpper,
            swapQuantity
        );
    }

    function collectFees() external override returns (uint256 fees0, uint256 fees1) {
        fees0 = pendingFeeAssets;
        fees1 = 0;

        if (fees0 > 0) {
            managedAssets += fees0;
            pendingFeeAssets = 0;
        }

        emit FeesCollected(msg.sender, fees0, fees1);
    }

    /**
     * @notice HIP-719: associate this vault with an HTS token (call token.associate() so msg.sender = vault gets associated)
     * @param token HTS token facade address. No-op if token has no associate() (e.g. MockUSDC on non-Hedera).
     */
    function associateToken(address token) external {
        if (token == address(0)) return;
        (bool ok,) = token.call(abi.encodeWithSignature("associate()"));
        if (!ok) { /* not HTS or already associated */ }
    }

    function _fundVault(uint256 amount) internal {
        (bool minted,) = token0.call(abi.encodeWithSignature("mint(address,uint256)", address(this), amount));
        if (!minted) {
            IERC20(token0).safeTransferFrom(msg.sender, address(this), amount);
        }
    }

    function _validateRange(int24 lower, int24 upper) internal pure {
        require(lower < upper, "MockBonzoVault: invalid range");
        require(lower % tickSpacing == 0, "MockBonzoVault: lower not aligned");
        require(upper % tickSpacing == 0, "MockBonzoVault: upper not aligned");
    }
}
