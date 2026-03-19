// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IBonzoVault.sol";
import "./interfaces/IDepositGuard.sol";

/**
 * @title IPrngSystemContract
 * @notice Hedera PRNG system contract for on-chain randomness
 * @dev See: https://docs.hedera.com/hedera/tutorials/more-tutorials/how-to-generate-a-random-number-on-hedera
 */
interface IPrngSystemContract {
    function getPseudorandomSeed() external returns (bytes32);
}

IPrngSystemContract constant PRNG =
    IPrngSystemContract(address(0x169));

/**
 * @title SancaPool
 * @notice Individual Arisan pool contract - manages one savings lottery group
 * @dev Uses minimal proxy pattern (EIP-1167) for gas efficiency
 */
contract SancaPool is ReentrancyGuard {
    address public owner;
    address public factory;
    using SafeERC20 for IERC20;
    
    // Pool configuration (set once during initialization)
    uint8 public maxMembers;
    uint256 public contributionPerPeriod;
    uint256 public periodDuration; // in seconds
    uint8 public yieldBonusSplit; // percentage (0-100) of yield to winner
    string public poolName;
    string public poolDescription;
    
    // Token, vault and guard addresses
    address public usdc;
    address public bonzoVault;   // vault (LP token); keeper calls rebalance/collectFees here
    address public depositGuard; // SancaPool uses guard for deposit/withdraw
    address public keeper;       // off-chain keeper service for vault operations
    
    // Vault position tracking
    uint256 public vaultShares;
    uint256 public totalDeposited; // Total USDC deposited to vault (principal, for yield calc)
    
    // Pool state
    enum PoolState {
        Open,      // Accepting members
        Active,    // Full, cycle running
        Completed  // All cycles completed
    }
    
    PoolState public state;
    
    // Members
    address[] public members;
    mapping(address => bool) public isMember;
    mapping(address => uint256) public memberIndex; // 1-indexed (0 = not member)
    
    // Cycle tracking
    uint256 public currentCycle; // 0-indexed
    uint256 public cycleStartTime;
    uint256 public totalCycles; // maxMembers cycles
    
    // Winner tracking
    mapping(uint256 => address) public cycleWinners; // cycle => winner
    mapping(uint256 => bool) public cycleCompleted; // cycle => completed
    address[] public winnerOrder; // permutation of members (each wins exactly once)
    
    uint256 public poolCreationTime;
    
    // Cycle contribution tracking (USDC, tidak di-wrap)
    mapping(uint256 => mapping(address => bool)) public cycleContributions; // cycle => member => contributed
    mapping(uint256 => uint256) public cycleUSDCBalance; // cycle => total USDC collected
    mapping(uint256 => uint256) public cycleContributionCount; // cycle => count of contributors
    mapping(address => uint256) public memberCollateral; // member => USDC collateral amount
    
    // Events
    event Joined(address indexed member, uint256 contribution);
    event PoolStarted(uint256 startTime, uint256 totalCycles);
    event DrawTriggered(uint256 indexed cycle);
    event WinnerSelected(uint256 indexed cycle, address indexed winner, uint256 prize);
    event YieldDistributed(uint256 indexed cycle, address indexed winner, uint256 yieldBonus, uint256 compounded);
    event CycleEnded(uint256 indexed cycle);
    event PoolCompleted();
    event FundsWithdrawn(address indexed member, uint256 amount);
    event Contributed(uint256 indexed cycle, address indexed member, uint256 amount);
    event CollateralLiquidated(uint256 indexed cycle, address indexed member, uint256 amount);
    event KeeperUpdated(address indexed newKeeper);
    event KeeperRebalanced(
        int24 baseLower,
        int24 baseUpper,
        int24 limitLower,
        int24 limitUpper,
        int256 swapQuantity
    );
    event KeeperFeesCollected();
    
    /**
     * @notice Initialize pool (called by factory via minimal proxy)
     * @param _creator Pool creator address
     * @param _maxMembers Maximum number of members (5-50)
     * @param _contributionPerPeriod Contribution amount per period in USDC (6 decimals)
     * @param _periodDuration Period duration in seconds
     * @param _yieldBonusSplit Percentage of yield to winner (0-100)
     * @param _poolName Name of the pool
     * @param _poolDescription Description of the pool
     * @param _usdc USDC token address
     * @param _bonzoVault Bonzo Vault address (LP token; keeper uses for rebalance/collectFees)
     * @param _depositGuard Deposit Guard address (pool uses for deposit/withdraw)
     */
    function initialize(
        address _creator,
        uint8 _maxMembers,
        uint256 _contributionPerPeriod,
        uint256 _periodDuration,
        uint8 _yieldBonusSplit,
        string memory _poolName,
        string memory _poolDescription,
        address _usdc,
        address _bonzoVault,
        address _depositGuard
    ) external {
        require(maxMembers == 0, "SancaPool: already initialized");
        require(_maxMembers > 1, "SancaPool: invalid maxMembers");
        require(_contributionPerPeriod > 0, "SancaPool: invalid contribution");
        require(_periodDuration > 0, "SancaPool: invalid periodDuration");
        require(_yieldBonusSplit <= 100, "SancaPool: invalid yieldBonusSplit");
        require(_usdc != address(0) && _bonzoVault != address(0) && _depositGuard != address(0), "SancaPool: invalid addresses");
        
        owner = _creator;
        factory = msg.sender;
        
        maxMembers = _maxMembers;
        contributionPerPeriod = _contributionPerPeriod;
        periodDuration = _periodDuration;
        yieldBonusSplit = _yieldBonusSplit;
        poolName = _poolName;
        poolDescription = _poolDescription;
        usdc = _usdc;
        bonzoVault = _bonzoVault;
        depositGuard = _depositGuard;
        keeper = _creator; // default: pool creator as initial keeper
        
        state = PoolState.Open;
        totalCycles = _maxMembers;
        poolCreationTime = block.timestamp;

        // Hedera HIP-719: pool calls token.associate() so this pool gets associated with USDC
        (bool ok,) = _usdc.call(abi.encodeWithSignature("associate()"));
        if (!ok) { /* Not Hedera HTS or already associated - continue */ }
    }
    
    /**
     * @notice Join the pool by contributing full upfront collateral
     * @dev Requires: pool is open, not already a member, full collateral = contributionPerPeriod * maxMembers
     * @dev Deposits collateral into Bonzo Vault for yield generation
     */
    function join() external nonReentrant {
        require(state == PoolState.Open, "SancaPool: pool not open");
        require(!isMember[msg.sender], "SancaPool: already a member");
        require(members.length < maxMembers, "SancaPool: pool full");
        
        // Calculate full upfront collateral
        uint256 fullCollateral = contributionPerPeriod * maxMembers;
        
        // Transfer USDC from user
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), fullCollateral);
        
        // Deposit collateral into vault via Deposit Guard
        IERC20(usdc).approve(depositGuard, fullCollateral);
        uint256 shares = IDepositGuard(depositGuard).deposit(bonzoVault, usdc, fullCollateral, 0, address(this));
        vaultShares += shares;
        totalDeposited += fullCollateral;
        
        // Track member's collateral (USDC amount)
        memberCollateral[msg.sender] = fullCollateral;
        
        // Add member
        members.push(msg.sender);
        isMember[msg.sender] = true;
        memberIndex[msg.sender] = members.length; // 1-indexed
        
        emit Joined(msg.sender, fullCollateral);
        
        // Start pool if full
        if (members.length == maxMembers) {
            _startPool();
        }
    }
    
    /**
     * @notice Start the pool when full
     * @dev Internal function called when maxMembers is reached
     */
    function _startPool() internal {
        state = PoolState.Active;
        currentCycle = 0;
        cycleStartTime = block.timestamp;

        // Shuffle winner order once using Hedera PRNG seed (permutation-based schedule)
        bytes32 seed = PRNG.getPseudorandomSeed();
        winnerOrder = members;
        for (uint256 i = winnerOrder.length - 1; i > 0; i--) {
            seed = keccak256(abi.encodePacked(seed, i, address(this)));
            uint256 j = uint256(seed) % (i + 1);
            (winnerOrder[i], winnerOrder[j]) = (winnerOrder[j], winnerOrder[i]);
        }
        
        emit PoolStarted(cycleStartTime, totalCycles);
    }
    
    /**
     * @notice Contribute USDC for current cycle
     * @dev USDC stays in pool (not vault). Prize = pool balance + yield from vault.
     */
    function contribute() external nonReentrant {
        require(state == PoolState.Active, "SancaPool: pool not active");
        require(isMember[msg.sender], "SancaPool: not a member");
        require(!cycleContributions[currentCycle][msg.sender], "SancaPool: already contributed");
        
        // Transfer USDC from user → stays in pool
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), contributionPerPeriod);
        
        cycleContributions[currentCycle][msg.sender] = true;
        cycleUSDCBalance[currentCycle] += contributionPerPeriod;
        cycleContributionCount[currentCycle]++;
        
        emit Contributed(currentCycle, msg.sender, contributionPerPeriod);
    }
    
    /**
     * @notice Internal function to liquidate missing contributions
     * @dev Called automatically in triggerDraw() if period ended. Withdraws from vault to cover.
     */
    function _liquidateMissingContributions() internal {
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            
            // If member didn't contribute and has collateral, liquidate
            if (!cycleContributions[currentCycle][member] && memberCollateral[member] >= contributionPerPeriod) {
                uint256 amountToLiquidate = contributionPerPeriod;
                
                // Withdraw from vault to get USDC for cycle balance (collateral → pool)
                uint256 totalAssets = IBonzoVault(bonzoVault).totalAssets();
                uint256 totalSupply = IERC20(bonzoVault).totalSupply();
                uint256 withdrawShares = (totalAssets > 0 && totalSupply > 0)
                    ? (amountToLiquidate * totalSupply) / totalAssets
                    : 0;
                if (withdrawShares > vaultShares) withdrawShares = vaultShares;
                
                if (withdrawShares > 0) {
                    IERC20(bonzoVault).approve(depositGuard, withdrawShares);
                    (uint256 usdcAmount, ) = IDepositGuard(depositGuard).withdraw(bonzoVault, withdrawShares, address(this), 0, 0);
                    vaultShares -= withdrawShares;
                    totalDeposited -= usdcAmount;
                    
                    // Add to cycle balance
                    cycleUSDCBalance[currentCycle] += usdcAmount;
                }
                
                cycleContributionCount[currentCycle]++;
                
                // Mark as contributed (via liquidation)
                cycleContributions[currentCycle][member] = true;
                
                // Deduct from collateral
                memberCollateral[member] -= amountToLiquidate;
                
                emit CollateralLiquidated(currentCycle, member, amountToLiquidate);
            }
        }
    }
    
    /**
     * @notice Settle the current cycle (payout + advance). Winner is pre-shuffled at pool start.
     */
    function settleCycle() public nonReentrant {
        require(state == PoolState.Active, "SancaPool: pool not active");
        require(block.timestamp >= cycleStartTime + periodDuration, "SancaPool: period not ended");
        require(!cycleCompleted[currentCycle], "SancaPool: cycle already completed");
        
        // Auto-liquidate members who didn't contribute (before checking)
        _liquidateMissingContributions();
        
        // Require all members contributed (or liquidated)
        require(
            cycleContributionCount[currentCycle] >= maxMembers,
            "SancaPool: not all members contributed"
        );
        
        require(winnerOrder.length == members.length && winnerOrder.length == maxMembers, "SancaPool: winner order not set");
        address winner = winnerOrder[currentCycle];
        
        cycleWinners[currentCycle] = winner;
        
        emit DrawTriggered(currentCycle);
        
        // 1. Prize = contributions + liquidations (semua sudah di pool)
        uint256 prizeBase = cycleUSDCBalance[currentCycle];
        if (prizeBase > 0) {
            IERC20(usdc).safeTransfer(winner, prizeBase);
        }
        cycleUSDCBalance[currentCycle] = 0;
        
        // 2. Yield dari vault → winner dapat yieldBonusSplit%
        uint256 yieldBonus = _distributeYield(winner);
        uint256 totalPrize = prizeBase + yieldBonus;
        
        emit WinnerSelected(currentCycle, winner, totalPrize);
        
        // Mark cycle as completed
        cycleCompleted[currentCycle] = true;
        
        // Move to next cycle or complete pool
        if (currentCycle + 1 < totalCycles) {
            currentCycle++;
            cycleStartTime = block.timestamp;
            emit CycleEnded(currentCycle - 1);
        } else {
            state = PoolState.Completed;
            emit CycleEnded(currentCycle);
            emit PoolCompleted();
        }
    }

    // Backward compatible alias (old name)
    function triggerDraw() external {
        settleCycle();
    }
    
    /**
     * @notice Distribute yield to winner - winner gets yieldBonusSplit% of yield, rest compounds
     * @param winner Winner address for this cycle
     * @return yieldBonus Amount of yield (USDC) transferred to winner
     */
    function _distributeYield(address winner) internal returns (uint256 yieldBonus) {
        uint256 totalAssets = IBonzoVault(bonzoVault).totalAssets();
        uint256 totalSupply = IERC20(bonzoVault).totalSupply();
        
        // Current value of our vault position: vaultShares * totalAssets / totalSupply
        uint256 currentValue = (totalSupply > 0 && vaultShares > 0)
            ? (vaultShares * totalAssets) / totalSupply
            : 0;
        
        uint256 totalAccruedYield = currentValue > totalDeposited
            ? currentValue - totalDeposited
            : 0;
        
        if (totalAccruedYield == 0) return 0;
        
        // Yield per member, winner gets yieldBonusSplit% of their share
        uint256 yieldPerMember = totalAccruedYield / maxMembers;
        yieldBonus = (yieldPerMember * yieldBonusSplit) / 100;
        
        if (yieldBonus == 0) return 0;
        
        // Withdraw yield bonus from vault and transfer to winner
        uint256 withdrawShares = (totalSupply > 0 && totalAssets > 0)
            ? (yieldBonus * totalSupply) / totalAssets
            : 0;
        if (withdrawShares > vaultShares) withdrawShares = vaultShares;
        if (withdrawShares == 0) return 0;
        
        IERC20(bonzoVault).approve(depositGuard, withdrawShares);
        (uint256 withdrawn, ) = IDepositGuard(depositGuard).withdraw(bonzoVault, withdrawShares, winner, 0, 0);
        vaultShares -= withdrawShares;
        
        uint256 compounded = totalAccruedYield - yieldBonus;
        emit YieldDistributed(currentCycle, winner, yieldBonus, compounded);
        
        return withdrawn;
    }
    
    /**
     * @notice Withdraw funds after pool completion
     * @dev Members can withdraw their share from vault after all cycles complete
     */
    function withdraw() external nonReentrant {
        require(state == PoolState.Completed, "SancaPool: pool not completed");
        require(isMember[msg.sender], "SancaPool: not a member");
        
        uint256 memberRemainingCollateral = memberCollateral[msg.sender];
        require(memberRemainingCollateral > 0, "SancaPool: no remaining collateral to withdraw");
        
        // Withdraw proportional share from vault (memberCollateral worth of USDC)
        uint256 totalAssets = IBonzoVault(bonzoVault).totalAssets();
        uint256 totalSupply = IERC20(bonzoVault).totalSupply();
        uint256 withdrawShares = (totalAssets > 0 && totalSupply > 0)
            ? (memberRemainingCollateral * totalSupply) / totalAssets
            : 0;
        if (withdrawShares > vaultShares) withdrawShares = vaultShares;
        
        uint256 usdcAmount = 0;
        if (withdrawShares > 0) {
            IERC20(bonzoVault).approve(depositGuard, withdrawShares);
            (usdcAmount, ) = IDepositGuard(depositGuard).withdraw(bonzoVault, withdrawShares, msg.sender, 0, 0);
            vaultShares -= withdrawShares;
        }
        
        memberCollateral[msg.sender] = 0;
        
        emit FundsWithdrawn(msg.sender, usdcAmount);
    }
    
    modifier onlyKeeper() {
        require(msg.sender == keeper || msg.sender == owner, "SancaPool: not keeper");
        _;
    }
    
    /**
     * @notice Update keeper address (owner only)
     */
    function setKeeper(address _keeper) external {
        require(msg.sender == owner || msg.sender == factory, "SancaPool: not owner/factory");
        require(_keeper != address(0), "SancaPool: invalid keeper");
        keeper = _keeper;
        emit KeeperUpdated(_keeper);
    }
    
    /**
     * @notice Get pool information
     */
    function getPoolInfo() external view returns (
        PoolState _state,
        uint8 _maxMembers,
        uint256 _currentMembers,
        uint256 _contributionPerPeriod,
        uint256 _periodDuration,
        uint8 _yieldBonusSplit,
        uint256 _currentCycle,
        uint256 _totalCycles,
        uint256 _cycleStartTime,
        uint256 _vaultShares,
        uint256 _vaultTotalAssets
    ) {
        return (
            state,
            maxMembers,
            uint256(members.length),
            contributionPerPeriod,
            periodDuration,
            yieldBonusSplit,
            currentCycle,
            totalCycles,
            cycleStartTime,
            vaultShares,
            IBonzoVault(bonzoVault).totalAssets()
        );
    }
    
    /**
     * @notice Get member list
     * @return Array of member addresses
     */
    function getMembers() external view returns (address[] memory) {
        return members;
    }
    
    /**
     * @notice Get winner for a specific cycle
     * @param cycle Cycle number
     * @return Winner address (zero if not selected yet)
     */
    function getCycleWinner(uint256 cycle) external view returns (address) {
        return cycleWinners[cycle];
    }
    
    /**
     * @notice Check if cycle is completed
     * @param cycle Cycle number
     * @return True if cycle is completed
     */
    function isCycleCompleted(uint256 cycle) external view returns (bool) {
        return cycleCompleted[cycle];
    }

    /**
     * @notice Keeper function: trigger vault rebalance
     * @dev Called by Hedera Agent Kit AI keepers to optimize vault performance
     */
    function keeperRebalance(
        int24 baseLower,
        int24 baseUpper,
        int24 limitLower,
        int24 limitUpper,
        int256 swapQuantity
    ) external onlyKeeper {
        IBonzoVault(bonzoVault).rebalance(baseLower, baseUpper, limitLower, limitUpper, swapQuantity);
        emit KeeperRebalanced(baseLower, baseUpper, limitLower, limitUpper, swapQuantity);
    }

    /**
     * @notice Keeper function: collect vault fees
     * @dev Called by Hedera Agent Kit AI keepers to optimize vault performance
     */
    function keeperCollectFees() external onlyKeeper {
        IBonzoVault(bonzoVault).collectFees();
        emit KeeperFeesCollected();
    }
}

