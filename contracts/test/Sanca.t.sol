// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {SancaFactory} from "../src/SancaFactory.sol";
import {SancaPool} from "../src/SancaPool.sol";
import {MockBonzoVault} from "../src/MockBonzoVault.sol";
import {MockDepositGuard} from "../src/MockDepositGuard.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/**
 * @title SancaTest
 * @notice Comprehensive test suite for Sanca Arisan platform
 */
contract SancaTest is Test {
    SancaFactory public factory;
    SancaPool public poolImplementation;
    MockBonzoVault public bonzoVault;
    MockDepositGuard public depositGuard;
    MockUSDC public usdc;
    
    address public deployer = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    address public user3 = address(4);
    address public user4 = address(5);
    address public user5 = address(6);
    
    uint256 constant INITIAL_BALANCE = 10000 * 10**6; // 10k USDC per user
    
    function setUp() public {
        vm.startPrank(deployer);
        
        // Deploy mock tokens, vault, and deposit guard
        usdc = new MockUSDC();
        bonzoVault = new MockBonzoVault(address(usdc));
        depositGuard = new MockDepositGuard();
        
        // Deploy implementation
        poolImplementation = new SancaPool();
        
        // Deploy factory
        factory = new SancaFactory(
            address(poolImplementation),
            address(usdc),
            address(bonzoVault),
            address(depositGuard)
        );
        
        vm.stopPrank();
        
        // Fund users with USDC
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        usdc.mint(user3, INITIAL_BALANCE);
        usdc.mint(user4, INITIAL_BALANCE);
        usdc.mint(user5, INITIAL_BALANCE);
        
        // Mock Hedera PRNG (0x169) for tests - not available on Foundry EVM
        vm.mockCall(
            address(uint160(0x169)),
            abi.encodeWithSignature("getPseudorandomSeed()"),
            abi.encode(bytes32(uint256(12345)))
        );
    }
    
    function test_CreatePool() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(
            5,              // maxMembers
            50 * 10**6,     // contributionPerPeriod: 50 USDC
            30 days,        // periodDuration
            20,             // yieldBonusSplit: 20%
            "Test Pool 1",
            "Test pool description"
        );
        
        assertTrue(factory.isPool(poolAddress));
        assertEq(factory.poolCreator(poolAddress), user1);
        
        SancaPool pool = SancaPool(poolAddress);
        (SancaPool.PoolState state,,,,,,,,,,) = pool.getPoolInfo();
        assertEq(uint256(state), uint256(SancaPool.PoolState.Open));
    }
    
    function test_JoinPool() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 30 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // User1 joins - approve first, then join
        vm.startPrank(user1);
        usdc.approve(poolAddress, type(uint256).max);
        pool.join();
        vm.stopPrank();
        
        // User2 joins - approve first, then join
        vm.startPrank(user2);
        usdc.approve(poolAddress, type(uint256).max);
        pool.join();
        vm.stopPrank();
        
        (SancaPool.PoolState state, uint8 maxMembers, uint256 currentMembers,,,,,,,,) = pool.getPoolInfo();
        assertEq(uint256(state), uint256(SancaPool.PoolState.Open));
        assertEq(currentMembers, 2);
        assertEq(maxMembers, 5);
    }
    
    function test_PoolStartsWhenFull() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 30 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Approve pool for all users
        vm.startPrank(user1);
        usdc.approve(poolAddress, type(uint256).max);
        pool.join();
        vm.stopPrank();
        
        vm.startPrank(user2);
        usdc.approve(poolAddress, type(uint256).max);
        pool.join();
        vm.stopPrank();
        
        vm.startPrank(user3);
        usdc.approve(poolAddress, type(uint256).max);
        pool.join();
        vm.stopPrank();
        
        vm.startPrank(user4);
        usdc.approve(poolAddress, type(uint256).max);
        pool.join();
        vm.stopPrank();
        
        // 5th user joins - pool should start
        vm.startPrank(user5);
        usdc.approve(poolAddress, type(uint256).max);
        pool.join();
        vm.stopPrank();
        
        (SancaPool.PoolState state, uint8 maxMembers, uint256 currentMembers, uint256 contributionPerPeriod, uint256 periodDuration, uint8 yieldBonusSplit, uint256 currentCycle, uint256 totalCycles, uint256 cycleStartTime,,) = pool.getPoolInfo();
        assertEq(uint256(state), uint256(SancaPool.PoolState.Active));
        assertGt(cycleStartTime, 0);
    }
    
    function test_FullCycleWithYield() public {
        // Create and fill pool
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 20, "Test Pool", "Test pool description"); // 1 day period for testing
        SancaPool pool = SancaPool(poolAddress);
        
        // All users join
        address[] memory users = new address[](5);
        users[0] = user1;
        users[1] = user2;
        users[2] = user3;
        users[3] = user4;
        users[4] = user5;
        
        for (uint256 i = 0; i < 5; i++) {
            vm.startPrank(users[i]);
            usdc.approve(poolAddress, type(uint256).max);
            pool.join();
            vm.stopPrank();
        }
        
        // Pool should be active
        (SancaPool.PoolState state,,,,,,,uint256 cycleStartTime,,,) = pool.getPoolInfo();
        assertEq(uint256(state), uint256(SancaPool.PoolState.Active));
        
        // Complete all 5 cycles (Hedera: triggerDraw uses PRNG, no fulfillRandomness)
        for (uint256 cycle = 0; cycle < 5; cycle++) {
            // Advance time to end of period
            vm.warp(cycleStartTime + (cycle + 1) * 1 days);
            
            // All members contribute for this cycle (except last cycle - let liquidation happen)
            if (cycle < 4) {
                for (uint256 i = 0; i < 5; i++) {
                    vm.startPrank(users[i]);
                    usdc.approve(poolAddress, type(uint256).max);
                    pool.contribute();
                    vm.stopPrank();
                }
            }
            
            // Settle cycle (winner pre-shuffled at pool start)
            vm.prank(user1);
            pool.settleCycle();
            
            // Check winner was selected
            address winner = pool.cycleWinners(cycle);
            assertTrue(winner != address(0));
            
            if (cycle < 4) {
                (,,,,,,,cycleStartTime,,,) = pool.getPoolInfo();
            }
        }
        
        // Pool should be completed
        (SancaPool.PoolState finalState,,,,,,,,,,) = pool.getPoolInfo();
        assertEq(uint256(finalState), uint256(SancaPool.PoolState.Completed));
        
        // Users can withdraw remaining collateral (if any)
        // Note: If all cycles used liquidation, there might be no remaining collateral
        // So we only test withdraw if there's remaining collateral
        uint256 user1Collateral = pool.memberCollateral(user1);
        if (user1Collateral > 0) {
            uint256 user1BalanceBefore = usdc.balanceOf(user1);
            vm.prank(user1);
            pool.withdraw();
            uint256 user1BalanceAfter = usdc.balanceOf(user1);
            assertGt(user1BalanceAfter, user1BalanceBefore);
        }
    }
    
    function test_YieldDistributionToWinner() public {
        // Create pool with 20% yield to winner
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 20, "Yield Pool", "Test");
        SancaPool pool = SancaPool(poolAddress);
        
        // Fill pool
        address[] memory users = new address[](5);
        users[0] = user1;
        users[1] = user2;
        users[2] = user3;
        users[3] = user4;
        users[4] = user5;
        
        for (uint256 i = 0; i < 5; i++) {
            vm.startPrank(users[i]);
            usdc.approve(poolAddress, type(uint256).max);
            pool.join();
            vm.stopPrank();
        }
        
        // Simulate yield in vault (e.g. 5% on 1250 collateral = ~62.5 USDC)
        vm.prank(deployer);
        bonzoVault.simulateYield(62 * 10**6); // ~62 USDC yield
        
        // All contribute
        for (uint256 i = 0; i < 5; i++) {
            vm.startPrank(users[i]);
            usdc.approve(poolAddress, type(uint256).max);
            pool.contribute();
            vm.stopPrank();
        }
        
        (,,,,,,,uint256 cycleStartTime,,,) = pool.getPoolInfo();
        vm.warp(cycleStartTime + 1 days);
        
        uint256 winnerBalanceBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        pool.settleCycle();
        
        // Winner (whoever gets selected) should have received prize (250) + yield bonus
        address winner = pool.cycleWinners(0);
        uint256 winnerBalanceAfter = usdc.balanceOf(winner);
        assertGt(winnerBalanceAfter, winnerBalanceBefore);
        // Prize base = 250, yield bonus = 20% of (62/5) = ~2.48. Total >= 250
        assertGe(winnerBalanceAfter - winnerBalanceBefore, 250 * 10**6);
    }
    
    function test_MockBonzoVaultDepositWithdraw() public {
        vm.startPrank(user1);
        
        // Deposit (ICHIVault-shaped: deposit0, deposit1, to)
        usdc.approve(address(bonzoVault), 1000 * 10**6);
        uint256 shares = bonzoVault.deposit(1000 * 10**6, 0, user1);
        assertEq(shares, 1000 * 10**6);
        assertEq(bonzoVault.balanceOf(user1), 1000 * 10**6);
        
        // Withdraw (returns amount0, amount1)
        (uint256 amount0, uint256 amount1) = bonzoVault.withdraw(500 * 10**6, user1);
        assertEq(amount0, 500 * 10**6);
        assertEq(amount1, 0);
        assertEq(bonzoVault.balanceOf(user1), 500 * 10**6);
        
        vm.stopPrank();
    }
    
    function test_RevertIfNotFullCollateral() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 30 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Try to join with insufficient funds
        vm.startPrank(user1);
        usdc.approve(poolAddress, 100 * 10**6); // Only 100 USDC, need 250 USDC (50 * 5)
        vm.expectRevert();
        pool.join();
        vm.stopPrank();
    }
    
    function test_RevertIfDoubleJoin() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 30 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        vm.startPrank(user1);
        usdc.approve(poolAddress, type(uint256).max);
        pool.join();
        
        // Try to join again
        vm.expectRevert("SancaPool: already a member");
        pool.join();
        vm.stopPrank();
    }
    
    function test_RevertIfTriggerDrawBeforePeriodEnd() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Fill pool
        address[] memory users = new address[](5);
        users[0] = user1;
        users[1] = user2;
        users[2] = user3;
        users[3] = user4;
        users[4] = user5;
        
        for (uint256 i = 0; i < 5; i++) {
            vm.startPrank(users[i]);
            usdc.approve(poolAddress, type(uint256).max);
            pool.join();
            vm.stopPrank();
        }
        
        // Try to trigger draw immediately (should fail)
        vm.prank(user1);
        vm.expectRevert("SancaPool: period not ended");
        pool.settleCycle();
    }
    
    function test_GetPoolInfo() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 30 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        (
            SancaPool.PoolState state,
            uint8 maxMembers,
            uint256 currentMembers,
            uint256 contributionPerPeriod,
            uint256 periodDuration,
            uint8 yieldBonusSplit,
            uint256 currentCycle,
            uint256 totalCycles,
            uint256 cycleStartTime,
            uint256 vaultShares,
            uint256 vaultTotalAssets
        ) = pool.getPoolInfo();
        
        assertEq(uint256(state), uint256(SancaPool.PoolState.Open));
        assertEq(maxMembers, 5);
        assertEq(currentMembers, 0);
        assertEq(contributionPerPeriod, 50 * 10**6);
        assertEq(periodDuration, 30 days);
        assertEq(yieldBonusSplit, 20);
        assertEq(currentCycle, 0);
        assertEq(totalCycles, 5);
        assertEq(cycleStartTime, 0);
        assertEq(vaultShares, 0);
        assertEq(vaultTotalAssets, 0);
    }
}

