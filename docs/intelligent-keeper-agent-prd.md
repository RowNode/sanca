# Intelligent Keeper Agent PRD

## Overview
Sanca will build a testnet-first Intelligent Keeper Agent using the Hedera Agent Kit for one specific use case:

**Volatility-aware CLMM vault management for HBAR/USDC.**

The keeper will monitor HBAR/USDC volatility and decide when a Bonzo-like CLMM vault should:

1. tighten its liquidity ranges during calm markets,
2. widen its liquidity ranges during volatile markets, or
3. stay unchanged if the current position remains acceptable.

The product goal is not to build a general-purpose DeFi AI. The goal is to build a specialized keeper that demonstrates adaptive CLMM maintenance while preserving maximum parity with Bonzo mainnet architecture.

## Problem Statement
CLMM vaults earn more fees when liquidity ranges are tight, but tight ranges also increase the risk of going out of range during sudden price moves. When volatility spikes, vaults can suffer reduced efficiency and increased impermanent loss pressure.

Static keepers do not adapt well to this. They only execute fixed schedules or simple threshold logic and do not produce context-aware rebalance parameters.

For Sanca, this creates three main problems:

1. Vault maintenance is reactive instead of volatility-aware.
2. There is no intelligent layer deciding when to narrow or widen CLMM ranges.
3. Custom keeper logic can drift too far from Bonzo mainnet patterns, making migration harder later.

## Product Vision
Build a volatility-aware CLMM keeper that:

1. reads HBAR/USDC vault and pool state,
2. consumes volatility data and related market context,
3. decides whether to `rebalance(...)`, `collectFees()`, or do nothing,
4. executes through `SancaPool`, not by bypassing pool accounting,
5. stays as close as possible to Bonzo mainnet vault and deposit guard patterns.

## Primary Goal
Deliver a hackathon-ready MVP on testnet that proves:

1. `SancaPool` can remain the owner of a Bonzo-like vault position,
2. a keeper agent can compute volatility-aware rebalance behavior,
3. the contract and service architecture can migrate later to a mainnet-like keeper with minimal redesign.

## Success Criteria
The MVP is successful if:

1. users can join pools and withdraw through a Bonzo-like vault flow on testnet,
2. `SancaPool` remains the source of truth for vault shares and collateral accounting,
3. the keeper can decide and execute `rebalance(...)` and `collectFees()` through pool keeper functions,
4. the frontend can show Bonzo-like metrics such as TVL, 7D APY, and 30D APY,
5. the keeper prompt and execution pipeline can later swap mocked signals for real sources without major redesign.

## Product Principles
### 1. Mainnet parity first
The system should follow Bonzo-like vault and deposit guard patterns. Do not add synthetic strategy abstractions unless they are strictly required for testnet simulation.

### 2. Pool-owned vault positions
Vault shares belong to `SancaPool`. The keeper should never bypass the pool and mutate vault state directly in ways that break pool accounting.

### 3. Specialized keeper, not general AI
The keeper is only responsible for volatility-aware CLMM maintenance. It is not a broad portfolio manager, governance agent, or sentiment-based trading system.

### 4. Mock the data source, not the architecture
Mocked yield and mocked volatility context are acceptable for testnet, but the system shape must still resemble the intended production flow.

### 5. FE displays, backend explains
Frontend should consume metrics and decision logs from APIs. It should not invent APY, risk, or strategy data locally.

## Scope
### In Scope for MVP
1. Bonzo-like testnet vault contract with share-based accounting.
2. Bonzo-like deposit guard for forward deposit and forward withdraw.
3. `SancaPool` integration where vault shares remain owned by the pool.
4. A keeper agent that decides whether to:
   - call `rebalance(...)`
   - call `collectFees()`
   - do nothing
5. A volatility pipeline for HBAR/USDC using mocked or seeded signal inputs.
6. Backend/API support for Bonzo-like metrics:
   - TVL
   - 7D APY
   - 30D APY
   - recent keeper actions
7. Frontend support for showing Bonzo-like vault detail metrics.

### Out of Scope for MVP
1. sentiment-driven strategy changes,
2. RAG or news analysis as a core decision input,
3. a general-purpose DeFi management agent,
4. full mainnet deployment,
5. non-HBAR/USDC strategy expansion,
6. autonomous portfolio allocation outside CLMM maintenance.

## Core Use Case
### Volatility-aware CLMM rebalancer
The keeper monitors realized volatility of HBAR/USDC and adapts CLMM range configuration.

### Low volatility
The keeper tightens ranges to improve fee capture.

### Medium volatility
The keeper preserves or slightly adjusts current ranges if no strong rebalance advantage is detected.

### High volatility
The keeper widens ranges to reduce the chance of going out of range and to reduce impermanent loss pressure.

### Extreme volatility
The keeper may choose a very defensive rebalance if supported by the Bonzo-like vault flow. If testnet parity does not support a more complex de-risk path, the fallback is a much wider defensive range instead of introducing a synthetic strategy mode.

## User Stories
### Depositor
1. As a user, I can join a Sanca pool and have my collateral managed through a Bonzo-like vault flow.
2. As a user, I can see vault metrics that resemble Bonzo mainnet-style displays.
3. As a user, I trust that withdrawals and yield accounting are handled through pool-owned vault accounting.

### Operator / Judge / Demo Viewer
1. As a demo viewer, I can understand that the keeper solves a clear CLMM risk problem.
2. As an operator, I can inspect why the keeper widened or tightened ranges.

### Keeper Agent
1. As the keeper agent, I receive structured context about volatility, vault state, and pool state.
2. As the keeper agent, I return a clear decision with rebalance parameters and explanation.

## Architecture Summary
### On-chain
#### `SancaFactory`
Creates pools and stores references to:
- USDC
- Bonzo-like vault
- deposit guard
- keeper address

#### `SancaPool`
Owns the vault position and vault shares.

Responsibilities:
1. accept user deposits and contributions,
2. forward collateral deposits to deposit guard and vault,
3. maintain accounting for `vaultShares`, `totalDeposited`, and `memberCollateral`,
4. expose keeper entrypoints for vault maintenance.

#### `MockBonzoVault`
Bonzo-like testnet CLMM vault with interfaces close to the real vault.

Required characteristics:
1. share-based accounting,
2. `deposit(...)`,
3. `withdraw(...)`,
4. `rebalance(...)` with concrete parameters,
5. `collectFees()`,
6. `totalAssets()`,
7. state sufficient for TVL and APY derivation.

#### `MockDepositGuard`
Deposit/withdraw forwarder that mirrors the role of `ICHIVaultDepositGuard`.

Responsibilities:
1. validate vault inputs,
2. pull assets from `SancaPool`,
3. forward deposit to vault,
4. forward withdrawal from vault.

### Backend / Agent Services
#### Metrics Service
Provides Bonzo-like vault display metrics:
- TVL
- 7D APY
- 30D APY
- recent keeper actions

#### Volatility Signal Service
Provides HBAR/USDC signal inputs:
- price feed
- realized volatility
- volatility regime
- optional range recommendation hints

#### Keeper Agent Service
Consumes:
- on-chain vault state,
- on-chain pool state,
- backend metrics,
- volatility service output

Produces:
- recommendation,
- explanation,
- rebalance parameters,
- decision log

Executes:
- `SancaPool.keeperRebalance(...)`
- `SancaPool.keeperCollectFees()`

## Keeper Flow
1. Read pool and vault state.
2. Read HBAR/USDC volatility context.
3. Build structured keeper context.
4. Ask the keeper agent to choose:
   - `rebalance`
   - `collectFees`
   - `noop`
5. Validate action against policy checks.
6. Execute through `SancaPool`.
7. Persist decision logs for observability and FE display.

## Contract Design Requirements
### Requirement 1: Pool remains vault position owner
All deposits to the vault must originate from `SancaPool`. The keeper must not bypass pool accounting.

### Requirement 2: Keeper uses parameterized rebalance
Do not introduce synthetic on-chain strategy modes. The keeper should produce concrete parameters such as:
- `baseLower`
- `baseUpper`
- `limitLower`
- `limitUpper`
- `swapQuantity`

### Requirement 3: Deposit guard remains a thin adapter
The deposit guard is responsible for forwarding and validation, not keeper strategy.

### Requirement 4: Mock yield must not distort parity
Yield simulation may exist, but should not force extra production-incompatible interfaces onto the vault unless clearly isolated for mock-only behavior.

## Yield Simulation Strategy
### Goal
Support meaningful vault growth, withdrawals, and APY displays in testnet while preserving mainnet-like keeper flow.

### Decision
Mock yield should not live in FE. It should come from:

1. mock vault accounting, and/or
2. backend metrics generation

### Recommended Approach
#### Contract-side simulation
The mock vault should simulate value growth that affects:
- `totalAssets()`
- share price
- user withdrawals
- pool-level yield calculations

This can be modeled through:
1. fee accrual over time,
2. mocked fee realization on `collectFees()`,
3. testnet-safe asset growth assumptions.

#### Backend-side simulation
The backend should compute and expose Bonzo-like metrics such as:
- `apy7d`
- `apy30d`
- `vaultTvlUsd`

This is where the MVP can display values such as roughly `29%` for 30D APY without hardcoding them in FE.

## Mock Data Strategy for Hackathon MVP
### Mocked inputs
1. HBAR/USDC volatility history or seeded candles,
2. volatility regime classification,
3. APY trend windows,
4. optional recommended rebalance hints for debug mode.

### Semi-real state
1. vault shares,
2. total assets,
3. withdrawal value,
4. pool-level yield accounting.

### Realistic execution flow
1. user deposits through `SancaPool`,
2. pool deposits through `DepositGuard`,
3. pool owns shares in the vault,
4. keeper triggers maintenance through `SancaPool`.

## FE Requirements
### Vault Detail View
FE should support Bonzo-like presentation of:
- Vault TVL
- 7D APY
- 30D APY
- protocol label
- strategy label
- recent keeper actions

### Data Origin
These values should come from backend/API, not local FE mock constants.

## API Requirements
### Keeper Context API
Example shape:

```json
{
  "vault": {
    "tvlUsd": 57340,
    "totalAssets": "57340000000",
    "principalUsd": 56000,
    "yieldAccruedUsd": 1340
  },
  "performance": {
    "apy7d": 29.51,
    "apy30d": 29.22
  },
  "market": {
    "pair": "HBAR/USDC",
    "hbarPrice": 0.081,
    "realizedVolatility1h": 0.09,
    "realizedVolatility24h": 0.22,
    "realizedVolatility7d": 0.34,
    "volatilityRegime": "high"
  },
  "pool": {
    "address": "0x...",
    "currentCycle": 1,
    "state": "Active"
  }
}
```

### Decision Log API
The backend should store and expose:
- timestamp
- action chosen
- explanation
- params used
- transaction hash if executed

## Keeper Decision Output
Expected normalized output:

```json
{
  "action": "rebalance",
  "reasoning": [
    "24h realized volatility is above the high-volatility threshold",
    "current CLMM range is likely too narrow",
    "wider range is recommended to reduce out-of-range risk"
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

## Security and Guardrails
### On-chain
1. Keeper-restricted functions only.
2. Pool remains sole owner of vault shares.
3. No direct keeper bypass of pool accounting.
4. Rebalance params validated for sanity before forwarding.

### Off-chain
1. Structured input validation.
2. Decision logs for observability.
3. Optional dry-run mode for demo and debugging.

## MVP Milestones
### Milestone 1: Contract Parity Base
1. Define Bonzo-like vault interface.
2. Build mock deposit guard.
3. Update `SancaPool` keeper functions to support parameterized rebalance.

### Milestone 2: Mock Yield and Metrics
1. Simulate vault growth and fee accrual.
2. Expose TVL and APY metrics.
3. Expose 7D and 30D APY via backend.

### Milestone 3: Volatility Signal and Keeper
1. Build HBAR/USDC volatility signal service.
2. Implement keeper prompt and decision engine.
3. Execute `rebalance(...)` and `collectFees()` through `SancaPool`.

### Milestone 4: FE Demo Layer
1. Bonzo-like vault metrics card.
2. Keeper decision history display.
3. Clear visibility into simulated APY and keeper actions.

## Open Questions
1. How close should the mock vault get to actual Bonzo/ICHI internals versus interface-only parity?
2. Should APY calculations be fully derived from contract snapshots, or can the backend seed historical windows for hackathon demo purposes?
3. For MVP, should defensive behavior be represented only by wider ranges, or is a more explicit de-risk path needed later?

## Final Recommendation
For the hackathon MVP:

1. keep the vault and deposit guard shape close to Bonzo mainnet,
2. keep the keeper scope limited to HBAR/USDC CLMM volatility management,
3. use parameterized `rebalance(...)`, not synthetic strategy modes,
4. mock yield at the backend and mock-vault layer, not in FE,
5. feed the keeper agent structured volatility context first,
6. make the keeper call `SancaPool`, never the vault directly.

This keeps the problem clear, the demo strong, and the migration path to a more mainnet-like keeper much cleaner.
