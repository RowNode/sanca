# Volatility-Aware CLMM Keeper Technical Spec

## Purpose
This document translates the PRD into an implementable MVP technical design.

The system is intentionally narrow:

1. pair: `HBAR/USDC`
2. keeper purpose: volatility-aware CLMM maintenance
3. allowed keeper actions:
   - `rebalance(...)`
   - `collectFees()`
   - `noop`

The target is a Bonzo-like testnet architecture that keeps migration effort low later.

## System Boundary
### Included systems
1. `SancaFactory`
2. `SancaPool`
3. Bonzo-like CLMM vault
4. deposit guard
5. backend metrics API
6. volatility signal service
7. keeper agent service
8. FE vault metrics display

### Excluded systems
1. sentiment ingestion
2. RAG/news analysis
3. generalized strategy modes
4. multi-vault support
5. multi-pair support

## High-Level Flow
1. User joins a pool.
2. `SancaPool` receives USDC and forwards it through `DepositGuard` into the vault.
3. `SancaPool` holds vault shares and keeps accounting state.
4. Backend computes vault metrics and volatility context.
5. Keeper agent reads pool state plus volatility context.
6. Keeper agent chooses:
   - `rebalance(...)`
   - `collectFees()`
   - `noop`
7. Keeper agent executes through `SancaPool`.
8. Decision and tx logs are stored for FE display.

## Contract Architecture
### `SancaFactory`
Current role is acceptable.

Needs to keep references to:
1. USDC
2. Bonzo-like vault
3. deposit guard
4. keeper address

No major redesign required for MVP.

### `SancaPool`
Current architecture is directionally correct because the pool owns the vault shares.

#### Current keeper functions
Today:
- `keeperRebalance()`
- `keeperCollectFees()`

#### Required change
`keeperRebalance()` should become parameterized to match a Bonzo-like vault:

```solidity
function keeperRebalance(
    int24 baseLower,
    int24 baseUpper,
    int24 limitLower,
    int24 limitUpper,
    int256 swapQuantity
) external onlyKeeper
```

And it should forward to:

```solidity
IBonzoVault(bonzoVault).rebalance(
    baseLower,
    baseUpper,
    limitLower,
    limitUpper,
    swapQuantity
);
```

#### Why
Mainnet parity requires the keeper to produce concrete rebalance parameters, not a symbolic strategy mode.

#### Must preserve
1. `vaultShares`
2. `totalDeposited`
3. `memberCollateral`
4. all deposit and withdrawal flows through pool-owned accounting

### `MockDepositGuard`
The guard should stay thin and close to `ICHIVaultDepositGuard` responsibilities.

#### Minimum responsibilities
1. validate vault target
2. validate token
3. transfer asset from caller to guard
4. approve vault
5. forward deposit
6. transfer vault shares or withdrawal outputs to the expected receiver

#### MVP minimum interface
To stay compatible with current `SancaPool` shape:

```solidity
function deposit(
    address vault,
    address token,
    uint256 amount,
    uint256 minimumProceeds,
    address to
) external returns (uint256 shares);

function withdraw(
    address vault,
    uint256 shares,
    address to,
    uint256 minAmount0,
    uint256 minAmount1
) external returns (uint256 amount0, uint256 amount1);
```

#### Notes
This interface can be evolved toward a more ICHI-like shape later, but the internal behavior should already mirror the same responsibilities.

### `MockBonzoVault`
This is the most important mock contract because it defines parity.

#### Required external behavior
1. ERC20 share token
2. `deposit(...)`
3. `withdraw(...)`
4. `rebalance(...)`
5. `collectFees()`
6. `totalAssets()`
7. optional getters needed by FE metrics

#### Recommended MVP interface
Prefer a Bonzo-like shape for CLMM:

```solidity
function deposit(
    uint256 deposit0,
    uint256 deposit1,
    address to
) external returns (uint256 shares);

function withdraw(
    uint256 shares,
    address to
) external returns (uint256 amount0, uint256 amount1);

function rebalance(
    int24 baseLower,
    int24 baseUpper,
    int24 limitLower,
    int24 limitUpper,
    int256 swapQuantity
) external;

function collectFees() external returns (uint256 fees0, uint256 fees1);

function totalAssets() external view returns (uint256);
```

#### Internal state
Recommended minimal state:
1. `token0`
2. `token1`
3. `baseLower`
4. `baseUpper`
5. `limitLower`
6. `limitUpper`
7. `vaultTvl` or asset accounting state
8. `lastFeeAccrualTimestamp`
9. `pendingFees0`
10. `pendingFees1`
11. `mockPpsHistory` or sufficient values to derive historical APY snapshots off-chain

## Yield and Fee Simulation
### Objective
Support realistic vault growth and Bonzo-like 7D/30D APY display without changing keeper workflow.

### Design choice
Mock the yield source, not the keeper action model.

### Contract-side simulation
#### Preferred behavior
1. pending fees grow over time
2. `collectFees()` realizes those fees
3. `totalAssets()` reflects vault value growth
4. withdrawals and pool-level yield distribution use those updated asset values

#### Suggested implementation
Store:
1. `lastAccrualTimestamp`
2. `feeAccrualRateBps`
3. `virtualAssets`

Pseudo-behavior:
1. on every state-changing call, accrue pending fees since the last timestamp
2. add accrued fees to `pendingFees0/pendingFees1` or directly to managed assets
3. `collectFees()` realizes them into the vault state and emits an event

### Backend-side metrics
Backend computes:
1. `apy7d`
2. `apy30d`
3. `vaultTvlUsd`
4. `recentFeesCollectedUsd`

For MVP these values may be seeded or derived from mock snapshot history.

## Volatility Signal Service
### Purpose
Produce structured HBAR/USDC volatility context for the keeper.

### Inputs
1. mock or seeded HBAR/USDC candles
2. latest price feed
3. vault state snapshot

### Outputs
```json
{
  "pair": "HBAR/USDC",
  "spotPrice": 0.081,
  "realizedVolatility1h": 0.09,
  "realizedVolatility24h": 0.22,
  "realizedVolatility7d": 0.34,
  "volatilityRegime": "high"
}
```

### Regime classification
Suggested thresholds for MVP:
1. `low`
2. `medium`
3. `high`
4. `extreme`

The exact numeric thresholds can be config-based and stored in backend.

## Keeper Agent Service
### Inputs
1. pool state from `SancaPool`
2. vault state from `MockBonzoVault`
3. metrics service payload
4. volatility signal payload

### Decision space
Only these actions are allowed:
1. `rebalance`
2. `collectFees`
3. `noop`

### Rules of thumb
#### Low volatility
Tighten the range.

#### Medium volatility
Keep range stable unless drift justifies rebalance.

#### High volatility
Widen the range.

#### Extreme volatility
Use a very defensive wide range. For MVP, do not introduce synthetic single-sided strategy modes unless contract parity later requires them.

### Output schema
```json
{
  "action": "rebalance",
  "reasoning": [
    "24h volatility is above the configured threshold",
    "current range is too narrow for the detected regime"
  ],
  "params": {
    "baseLower": -120,
    "baseUpper": 120,
    "limitLower": -480,
    "limitUpper": 480,
    "swapQuantity": "2500000"
  }
}
```

### Execution path
1. agent validates output
2. agent calls `SancaPool.keeperRebalance(...)` or `SancaPool.keeperCollectFees()`
3. agent persists decision log and tx hash

## API Design
### `GET /api/keeper/context`
Returns the merged context used by the agent.

Example:
```json
{
  "pool": {
    "address": "0x...",
    "state": "Active",
    "currentCycle": 1
  },
  "vault": {
    "tvlUsd": 57340,
    "totalAssets": "57340000000",
    "baseLower": -80,
    "baseUpper": 80,
    "limitLower": -240,
    "limitUpper": 240
  },
  "performance": {
    "apy7d": 29.51,
    "apy30d": 29.22
  },
  "market": {
    "pair": "HBAR/USDC",
    "spotPrice": 0.081,
    "realizedVolatility1h": 0.09,
    "realizedVolatility24h": 0.22,
    "realizedVolatility7d": 0.34,
    "volatilityRegime": "high"
  }
}
```

### `GET /api/keeper/decisions`
Returns past keeper decisions and associated tx hashes for observability and FE display.

## Frontend Requirements
### Vault metrics
FE should render:
1. Vault TVL
2. 7D APY
3. 30D APY
4. protocol label
5. strategy label
6. recent keeper actions

### Data source
FE must not hardcode APY or volatility metrics. It should consume backend/API responses.

## Security and Guardrails
### On-chain
1. `onlyKeeper` access for maintenance functions
2. pool remains sole owner of vault shares
3. rebalance parameters sanity-checked before forwarding
4. no direct keeper bypass of pool accounting

### Off-chain
1. validate structured context before prompting
2. log every decision and execution
3. optional dry-run mode
4. config-based thresholds for volatility regime classification

## Engineering Tasks
### Contracts
1. define Bonzo-like vault interface
2. implement `MockBonzoVault`
3. implement `MockDepositGuard`
4. update `SancaPool.keeperRebalance(...)` to accept params
5. ensure `keeperCollectFees()` remains available

### Backend
1. build volatility signal service
2. build vault metrics service
3. build keeper context API
4. build decision log store

### Keeper
1. define prompt schema
2. implement regime-aware decision rules
3. implement execution client

### Frontend
1. show Bonzo-like vault metrics
2. show recent keeper actions
3. surface vault detail data cleanly

## MVP Risks
1. Over-mocking may make the demo feel fake if contract state does not move in believable ways.
2. Under-mocking may make the hackathon scope too large.
3. Vault interface drift from Bonzo mainnet would reduce migration value later.

## Final Recommendation
Build the MVP as a narrow volatility-aware HBAR/USDC CLMM keeper with:

1. Bonzo-like vault and deposit guard interfaces,
2. pool-owned vault accounting,
3. parameterized rebalance execution,
4. mocked yield and APY generation outside FE,
5. structured volatility context for the agent.

This gives Sanca a focused, credible demo and a much cleaner path toward a production keeper later.
