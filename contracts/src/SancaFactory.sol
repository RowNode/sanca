// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SancaPool.sol";

/**
 * @title SancaFactory
 * @notice Factory contract for creating Arisan pools using minimal proxy pattern (EIP-1167)
 * @dev Gas-efficient pool creation using clone pattern
 */
contract SancaFactory is Ownable {
    using Clones for address;
    
    // Implementation contract address (SancaPool)
    address public immutable poolImplementation;
    
    // Configuration addresses
    address public usdc;
    address public bonzoVault;
    address public depositGuard;
    address public keeper; // off-chain keeper service for vault operations
    
    // Pool tracking
    address[] public pools;
    mapping(address => bool) public isPool;
    mapping(address => address) public poolCreator; // pool => creator
    
    // Events
    event PoolCreated(
        address indexed pool,
        address indexed creator,
        uint8 maxMembers,
        uint256 contributionPerPeriod,
        uint256 periodDuration,
        uint8 yieldBonusSplit,
        string poolName,
        string poolDescription
    );
    
    event ConfigUpdated(string indexed configType, address newAddress);
    
    /**
     * @notice Constructor
     * @param _poolImplementation Address of SancaPool implementation contract
     * @param _usdc USDC token address
     * @param _bonzoVault Bonzo Vault address (keeper uses for rebalance/collectFees)
     * @param _depositGuard Deposit Guard address (pool uses for deposit/withdraw)
     */
    constructor(
        address _poolImplementation,
        address _usdc,
        address _bonzoVault,
        address _depositGuard
    ) Ownable(msg.sender) {
        require(_poolImplementation != address(0), "SancaFactory: invalid implementation");
        require(_usdc != address(0), "SancaFactory: invalid USDC");
        require(_bonzoVault != address(0), "SancaFactory: invalid Bonzo Vault");
        require(_depositGuard != address(0), "SancaFactory: invalid Deposit Guard");
        
        poolImplementation = _poolImplementation;
        usdc = _usdc;
        bonzoVault = _bonzoVault;
        depositGuard = _depositGuard;
    }
    
    /**
     * @notice Create a new Arisan pool
     * @param _maxMembers Maximum number of members (minimum 2)
     * @param _contributionPerPeriod Contribution amount per period in USDC (6 decimals, e.g., 50e6 for 50 USDC)
     * @param _periodDuration Period duration in seconds (e.g., 2592000 for 30 days)
     * @param _yieldBonusSplit Percentage of yield to winner (0-100)
     * @param _poolName Name of the pool
     * @param _poolDescription Description of the pool
     * @return pool Address of the newly created pool
     */
    function createPool(
        uint8 _maxMembers,
        uint256 _contributionPerPeriod,
        uint256 _periodDuration,
        uint8 _yieldBonusSplit,
        string memory _poolName,
        string memory _poolDescription
    ) external returns (address pool) {
        require(_maxMembers > 1, "SancaFactory: invalid maxMembers");
        require(_contributionPerPeriod > 0, "SancaFactory: invalid contribution");
        require(_periodDuration > 0, "SancaFactory: invalid periodDuration");
        require(_yieldBonusSplit <= 100, "SancaFactory: invalid yieldBonusSplit");
        require(bytes(_poolName).length > 0, "SancaFactory: empty pool name");
        
        // Clone the implementation contract using EIP-1167 minimal proxy
        pool = Clones.clone(poolImplementation);
        
        // Initialize the pool
        SancaPool(pool).initialize(
            msg.sender,
            _maxMembers,
            _contributionPerPeriod,
            _periodDuration,
            _yieldBonusSplit,
            _poolName,
            _poolDescription,
            usdc,
            bonzoVault,
            depositGuard
        );

        // If global keeper is set, override default keeper for this pool
        if (keeper != address(0)) {
            SancaPool(pool).setKeeper(keeper);
        }
        
        // Track the pool
        pools.push(pool);
        isPool[pool] = true;
        poolCreator[pool] = msg.sender;
        
        emit PoolCreated(
            pool,
            msg.sender,
            _maxMembers,
            _contributionPerPeriod,
            _periodDuration,
            _yieldBonusSplit,
            _poolName,
            _poolDescription
        );
        
        return pool;
    }
    
    /**
     * @notice Update configuration addresses (owner only)
     */
    function setUSDC(address _usdc) external onlyOwner {
        require(_usdc != address(0), "SancaFactory: invalid address");
        usdc = _usdc;
        emit ConfigUpdated("USDC", _usdc);
    }
    
    function setBonzoVault(address _bonzoVault) external onlyOwner {
        require(_bonzoVault != address(0), "SancaFactory: invalid address");
        bonzoVault = _bonzoVault;
        emit ConfigUpdated("BonzoVault", _bonzoVault);
    }
    
    function setDepositGuard(address _depositGuard) external onlyOwner {
        require(_depositGuard != address(0), "SancaFactory: invalid address");
        depositGuard = _depositGuard;
        emit ConfigUpdated("DepositGuard", _depositGuard);
    }
    
    function setKeeper(address _keeper) external onlyOwner {
        require(_keeper != address(0), "SancaFactory: invalid address");
        keeper = _keeper;
        emit ConfigUpdated("Keeper", _keeper);
    }
    
    /**
     * @notice Get total number of pools created
     * @return Total pools count
     */
    function getPoolCount() external view returns (uint256) {
        return pools.length;
    }
    
    /**
     * @notice Get pool address by index
     * @param index Pool index
     * @return Pool address
     */
    function getPool(uint256 index) external view returns (address) {
        require(index < pools.length, "SancaFactory: invalid index");
        return pools[index];
    }
    
    /**
     * @notice Get all pools
     * @return Array of all pool addresses
     */
    function getAllPools() external view returns (address[] memory) {
        return pools;
    }
}

