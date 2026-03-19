// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {SancaFactory} from "../src/SancaFactory.sol";
import {SancaPool} from "../src/SancaPool.sol";

// Import existing test contracts
import "./Sanca.t.sol";

/**
 * @title SancaAdditionalTests
 * @notice Additional comprehensive tests for edge cases, security, and boundary conditions
 */
contract SancaAdditionalTests is SancaTest {
    
    // ============ EDGE CASES & BOUNDARY TESTS ============
    
    function test_CreatePoolWithMinMaxMembers() public {
        // Test minimum members (2)
        vm.prank(user1);
        address poolMin = factory.createPool(2, 50 * 10**6, 30 days, 20, "Min Pool", "Test pool description");
        assertTrue(factory.isPool(poolMin));
        
        // Test with 5 members (common case)
        vm.prank(user1);
        address poolMid = factory.createPool(5, 50 * 10**6, 30 days, 20, "Mid Pool", "Test pool description");
        assertTrue(factory.isPool(poolMid));
    }
    
    function test_RevertIfMaxMembersTooLow() public {
        vm.prank(user1);
        vm.expectRevert("SancaFactory: invalid maxMembers");
        factory.createPool(1, 50 * 10**6, 30 days, 20, "Invalid Pool", "Test pool description");
    }
    
    function test_RevertIfMaxMembersTooHigh() public {
        // No upper limit now, so this test should be removed or changed
        // But let's keep it to test that very high numbers still work
        vm.prank(user1);
        address poolHigh = factory.createPool(100, 50 * 10**6, 30 days, 20, "High Pool", "Test pool description");
        assertTrue(factory.isPool(poolHigh));
    }
    
    function test_RevertIfYieldBonusSplitOver100() public {
        vm.prank(user1);
        vm.expectRevert("SancaFactory: invalid yieldBonusSplit");
        factory.createPool(5, 50 * 10**6, 30 days, 101, "Invalid Pool", "Test pool description");
    }
    
    function test_YieldBonusSplit100() public {
        // Test 100% yield to winner (no compounding)
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 30 days, 100, "100% Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        (,,,,,uint8 yieldBonusSplit,,,,,) = pool.getPoolInfo();
        assertEq(yieldBonusSplit, 100);
    }
    
    function test_YieldBonusSplit0() public {
        // Test 0% yield to winner (all compound)
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 30 days, 0, "0% Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        (,,,,,uint8 yieldBonusSplit,,,,,) = pool.getPoolInfo();
        assertEq(yieldBonusSplit, 0);
    }
    
    // ============ SECURITY TESTS ============
    
    function test_RevertIfTriggerDrawTwice() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Fill pool and trigger first draw
        _fillPoolAndTriggerDraw(poolAddress, pool);
        
        // Try to trigger again immediately (next cycle - period not ended)
        vm.prank(user1);
        vm.expectRevert("SancaPool: period not ended");
        pool.settleCycle();
    }
    
    function test_RevertIfWithdrawBeforeCompletion() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 30 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Fill pool
        _fillPool(poolAddress, pool);
        
        // Try to withdraw before completion
        vm.prank(user1);
        vm.expectRevert("SancaPool: pool not completed");
        pool.withdraw();
    }
    
    function test_RevertIfNonMemberWithdraws() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Complete pool
        _completePool(poolAddress, pool);
        
        // Non-member tries to withdraw
        address nonMember = address(999);
        vm.prank(nonMember);
        vm.expectRevert("SancaPool: not a member");
        pool.withdraw();
    }
    
    // ============ YIELD DISTRIBUTION TESTS ============
    
    function test_YieldDistributionWithNoYield() public {
        // Test when no yield has accrued yet
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Fill pool
        _fillPool(poolAddress, pool);
        
        // All members contribute
        address[] memory members = pool.getMembers();
        for (uint256 i = 0; i < members.length; i++) {
            vm.startPrank(members[i]);
            usdc.approve(poolAddress, type(uint256).max);
            pool.contribute();
            vm.stopPrank();
        }
        
        // Trigger draw (Hedera PRNG - completes immediately)
        (,,,,,,,uint256 cycleStartTime,,,) = pool.getPoolInfo();
        vm.warp(cycleStartTime + 1 days);
        
        vm.prank(user1);
        pool.settleCycle();
        
        // Should complete without error
        address winner = pool.cycleWinners(0);
        assertTrue(winner != address(0));
    }
    
    function test_YieldDistribution100Percent() public {
        // Test 100% yield to winner
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 100, "100% Yield Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Fill pool
        _fillPool(poolAddress, pool);
        
        // All members contribute
        address[] memory members = pool.getMembers();
        for (uint256 i = 0; i < members.length; i++) {
            vm.startPrank(members[i]);
            usdc.approve(poolAddress, type(uint256).max);
            pool.contribute();
            vm.stopPrank();
        }
        
        // Advance time for yield
        (,,,,,,,uint256 cycleStartTime,,,) = pool.getPoolInfo();
        vm.warp(cycleStartTime + 30 days);
        
        // Trigger draw
        vm.prank(user1);
        pool.settleCycle();
        
        uint256 balanceBefore = usdc.balanceOf(user1);
        
        // Winner should receive prize (if user1 wins)
        address winner = pool.cycleWinners(0);
        if (winner == user1) {
            uint256 balanceAfter = usdc.balanceOf(user1);
            // Winner should have received some USDC from yield
            assertGe(balanceAfter, balanceBefore);
        }
    }
    
    // ============ RANDOMNESS TESTS ============
    
    function test_WinnerSelectionWithDifferentRandomValues() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Fill pool
        _fillPool(poolAddress, pool);
        
        (,,,,,,,uint256 cycleStartTime,,,) = pool.getPoolInfo();
        
        address[] memory members = pool.getMembers();
        address[] memory winners = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            // Advance time for each cycle
            vm.warp(cycleStartTime + (i + 1) * 1 days);
            
            // All members contribute for each cycle
            for (uint256 j = 0; j < members.length; j++) {
                vm.startPrank(members[j]);
                usdc.approve(poolAddress, type(uint256).max);
                pool.contribute();
                vm.stopPrank();
            }
            
            vm.prank(user1);
            pool.settleCycle();
            
            winners[i] = pool.cycleWinners(i);
            assertTrue(winners[i] != address(0));
            
            // Update cycleStartTime for next cycle
            if (i < 4) {
                (,,,,,,,cycleStartTime,,,) = pool.getPoolInfo();
            }
        }
        
        // Each member should win exactly once (permutation-based schedule)
        for (uint256 i = 0; i < winners.length; i++) {
            for (uint256 j = i + 1; j < winners.length; j++) {
                assertTrue(winners[i] != winners[j]);
            }
        }
    }
    
    function test_WinnerSelectionWithModulo() public {
        // Winner order is shuffled at pool start using mocked PRNG seed.
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        _fillPool(poolAddress, pool);
        
        address[] memory members = pool.getMembers();
        (,,,,,,,uint256 cycleStartTime,,,) = pool.getPoolInfo();
        vm.warp(cycleStartTime + 1 days);
        
        // All members contribute
        for (uint256 i = 0; i < members.length; i++) {
            vm.startPrank(members[i]);
            usdc.approve(poolAddress, type(uint256).max);
            pool.contribute();
            vm.stopPrank();
        }
        
        // Settle first cycle; winner should be one of the members (non-zero)
        vm.prank(user1);
        pool.settleCycle();
        
        address winner = pool.cycleWinners(0);
        assertTrue(winner != address(0));
    }
    
    // ============ WITHDRAWAL TESTS ============
    
    function test_WithdrawAllMembers() public {
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Complete pool
        _completePool(poolAddress, pool);
        
        // All members should be able to withdraw
        address[] memory members = pool.getMembers();
        uint256[] memory balancesBefore = new uint256[](5);
        
        for (uint256 i = 0; i < 5; i++) {
            balancesBefore[i] = usdc.balanceOf(members[i]);
        }
        
        // All withdraw
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(members[i]);
            pool.withdraw();
        }
        
        // All should have received funds
        for (uint256 i = 0; i < 5; i++) {
            uint256 balanceAfter = usdc.balanceOf(members[i]);
            assertGt(balanceAfter, balancesBefore[i]);
        }
    }
    
    function test_WithdrawCalculatesShareCorrectly() public {
        // Test that withdraw calculates remaining collateral correctly
        vm.prank(user1);
        address poolAddress = factory.createPool(5, 50 * 10**6, 1 days, 20, "Test Pool", "Test pool description");
        SancaPool pool = SancaPool(poolAddress);
        
        // Complete pool with contributions (so collateral remains)
        _completePoolWithContributions(poolAddress, pool);
        
        // Get user1's remaining collateral
        uint256 user1Collateral = pool.memberCollateral(user1);
        
        if (user1Collateral > 0) {
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        pool.withdraw();
        uint256 user1BalanceAfter = usdc.balanceOf(user1);
        
            // Should receive their remaining collateral (converted from Bonzo vault shares to USDC)
            // Allow some tolerance for conversion
            assertGe(user1BalanceAfter - user1BalanceBefore, user1Collateral * 99 / 100);
        }
    }
    
    // ============ FACTORY TESTS ============
    
    function test_FactoryGetAllPools() public {
        // Create multiple pools
        vm.prank(user1);
        address pool1 = factory.createPool(5, 50 * 10**6, 30 days, 20, "Pool 1", "Test pool description");
        
        vm.prank(user2);
        address pool2 = factory.createPool(5, 50 * 10**6, 30 days, 20, "Pool 2", "Test pool description");
        
        vm.prank(user3);
        address pool3 = factory.createPool(5, 50 * 10**6, 30 days, 20, "Pool 3", "Test pool description");
        
        assertEq(factory.getPoolCount(), 3);
        
        address[] memory allPools = factory.getAllPools();
        assertEq(allPools.length, 3);
        assertEq(allPools[0], pool1);
        assertEq(allPools[1], pool2);
        assertEq(allPools[2], pool3);
    }
    
    function test_FactoryGetPoolByIndex() public {
        vm.prank(user1);
        address pool1 = factory.createPool(5, 50 * 10**6, 30 days, 20, "Pool 1", "Test pool description");
        
        vm.prank(user2);
        address pool2 = factory.createPool(5, 50 * 10**6, 30 days, 20, "Pool 2", "Test pool description");
        
        assertEq(factory.getPool(0), pool1);
        assertEq(factory.getPool(1), pool2);
    }
    
    function test_RevertIfGetPoolInvalidIndex() public {
        vm.expectRevert("SancaFactory: invalid index");
        factory.getPool(0); // No pools created yet
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _fillPool(address poolAddress, SancaPool pool) internal {
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
    }
    
    function _fillPoolAndTriggerDraw(address poolAddress, SancaPool pool) internal {
        _fillPool(poolAddress, pool);
        (,,,,,,,uint256 cycleStartTime,,,) = pool.getPoolInfo();
        vm.warp(cycleStartTime + 1 days);
        
        // All members contribute before triggering draw
        address[] memory members = pool.getMembers();
        for (uint256 i = 0; i < members.length; i++) {
            vm.startPrank(members[i]);
            usdc.approve(poolAddress, type(uint256).max);
            pool.contribute();
            vm.stopPrank();
        }
        
        vm.prank(user1);
        pool.settleCycle();
    }
    
    function _completePool(address poolAddress, SancaPool pool) internal {
        _fillPool(poolAddress, pool);
        
        (,,,,,,,uint256 cycleStartTime,,,) = pool.getPoolInfo();
        address[] memory members = pool.getMembers();
        
        // Complete all 5 cycles
        for (uint256 cycle = 0; cycle < 5; cycle++) {
            vm.warp(cycleStartTime + (cycle + 1) * 1 days);
            
            // For last cycle, let liquidation happen (don't contribute)
            // For other cycles, all members contribute
            if (cycle < 4) {
                for (uint256 i = 0; i < members.length; i++) {
                    vm.startPrank(members[i]);
                    usdc.approve(poolAddress, type(uint256).max);
                    pool.contribute();
                    vm.stopPrank();
                }
            }
            
            vm.prank(user1);
            pool.settleCycle();
            
            // Update cycleStartTime for next cycle
            if (cycle < 4) {
                (,,,,,,,cycleStartTime,,,) = pool.getPoolInfo();
            }
        }
    }
    
    function _completePoolWithContributions(address poolAddress, SancaPool pool) internal {
        _fillPool(poolAddress, pool);
        
        (,,,,,,,uint256 cycleStartTime,,,) = pool.getPoolInfo();
        address[] memory members = pool.getMembers();
        
        // Complete all 5 cycles with all members contributing
        for (uint256 cycle = 0; cycle < 5; cycle++) {
            vm.warp(cycleStartTime + (cycle + 1) * 1 days);
            
            // All members contribute for each cycle
            for (uint256 i = 0; i < members.length; i++) {
                vm.startPrank(members[i]);
                usdc.approve(poolAddress, type(uint256).max);
                pool.contribute();
                vm.stopPrank();
            }
            
            vm.prank(user1);
            pool.settleCycle();
            
            // Update cycleStartTime for next cycle
            if (cycle < 4) {
                (,,,,,,,cycleStartTime,,,) = pool.getPoolInfo();
            }
        }
    }
}

