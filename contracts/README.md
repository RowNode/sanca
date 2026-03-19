# Sanca Contracts

Smart contracts for Sanca's Hedera-based savings protocol, including:
- pool creation via minimal proxies
- Bonzo-style vault integration on testnet
- keeper-aware vault maintenance hooks
- ROSCA contribution, payout, and collateral flows

## Stack

- `Foundry`
- `Solidity 0.8.30`
- `OpenZeppelin`
- `Hedera EVM`

Foundry documentation: [https://book.getfoundry.sh/](https://book.getfoundry.sh/)

## Current Contract Set

### `SancaFactory.sol`

Factory contract that:
- deploys `SancaPool` clones via EIP-1167
- stores global config for `USDC`, `bonzoVault`, `depositGuard`, and optional `keeper`
- creates and tracks all pools

### `SancaPool.sol`

The main pool contract that:
- manages the pool lifecycle: `Open -> Active -> Completed`
- accepts upfront collateral from members
- forwards vault deposit and withdrawal via `IDepositGuard`
- tracks `vaultShares`, `totalDeposited`, and `memberCollateral`
- supports keeper actions through:
  - `keeperRebalance(...)`
  - `keeperCollectFees()`
- uses Hedera PRNG (`0x169`) to generate winner order when the pool becomes active

### `MockBonzoVault.sol`

Bonzo-style testnet vault used for MVP demos:
- share-based accounting
- single-asset USDC-style flow
- parameterized `rebalance(...)`
- `collectFees()`
- `totalAssets()`
- mock yield and fee simulation helpers

### `MockDepositGuard.sol`

Thin forwarding contract used by `SancaPool` to:
- deposit into the vault
- withdraw from the vault
- keep pool logic aligned with Bonzo-style guard patterns

### `MockUSDC.sol`

Test token used in local/testnet flows:
- 6 decimals
- owner mint and burn
- faucet support
- optional metadata such as `logoURI`

### Interfaces

- `interfaces/IBonzoVault.sol`
- `interfaces/IDepositGuard.sol`

These keep the pool logic decoupled from specific vault and guard implementations.

## Project Layout

```text
contracts/
├── src/
│   ├── SancaFactory.sol
│   ├── SancaPool.sol
│   ├── MockBonzoVault.sol
│   ├── MockDepositGuard.sol
│   ├── MockUSDC.sol
│   └── interfaces/
├── script/
│   ├── DeployHedera.s.sol
│   ├── DeployHederaInfra.s.sol
│   ├── DeployHederaSanca.s.sol
│   └── verif.txt
└── foundry.toml
```

## Build And Test

### Build

```bash
forge build
```

### Test

```bash
forge test
```

### Test with verbosity

```bash
forge test -vvv
```

### Format

```bash
forge fmt
```

### Gas snapshot

```bash
forge snapshot
```

## Environment

Create `contracts/.env` with at least:

```env
PRIVATE_KEY=your_private_key
HEDERA_RPC_URL=https://testnet.hashio.io/api
```

Optional deployment inputs:

```env
HEDERA_USDC=0x...
BONZO_VAULT=0x...
DEPOSIT_GUARD=0x...
KEEPER_ADDRESS=0x...
```

Notes:
- `HEDERA_USDC`, `BONZO_VAULT`, and `DEPOSIT_GUARD` are optional for the all-in-one deployment.
- They are required for the phase-2 deployment if you use the split deployment flow.
- The RPC alias `testnet` comes from `foundry.toml` and resolves from `HEDERA_RPC_URL`.

## Deployment

There are two deployment styles:
- all-in-one deployment
- two-phase deployment

### Option 1: All-in-one deployment

This deploys:
1. `MockUSDC` if `HEDERA_USDC` is not provided
2. `MockBonzoVault` if `BONZO_VAULT` is not provided
3. `MockDepositGuard` if `DEPOSIT_GUARD` is not provided
4. `SancaPool` implementation
5. `SancaFactory`

Command:

```bash
forge script script/DeployHedera.s.sol:DeployHedera \
  --rpc-url testnet \
  --broadcast \
  --gas-limit 15000000
```

If simulation runs into gas issues on Hedera, use:

```bash
forge script script/DeployHedera.s.sol:DeployHedera \
  --rpc-url testnet \
  --broadcast \
  --gas-limit 15000000 \
  --skip-simulation
```

### Option 2: Two-phase deployment

#### Phase 1: Infra

Deploys or reuses:
- `MockUSDC`
- `MockBonzoVault`
- `MockDepositGuard`

Command:

```bash
forge script script/DeployHederaInfra.s.sol:DeployHederaInfra \
  --rpc-url testnet \
  --broadcast \
  --gas-limit 15000000
```

After phase 1, export the printed addresses:

```bash
export HEDERA_USDC=0x...
export BONZO_VAULT=0x...
export DEPOSIT_GUARD=0x...
```

#### Phase 2: Sanca core

Deploys:
- `SancaPool` implementation
- `SancaFactory`
- optional global keeper if `KEEPER_ADDRESS` is provided

Command:

```bash
forge script script/DeployHederaSanca.s.sol:DeployHederaSanca \
  --rpc-url testnet \
  --broadcast \
  --gas-limit 15000000
```

## Post-Deployment

After deployment, update the relevant addresses in:
- root frontend `.env`
- `keeper-service/.env`
- `settler-service/.env`

Useful values to record:
- `HEDERA_USDC`
- `BONZO_VAULT`
- `DEPOSIT_GUARD`
- `SancaPool` implementation
- `SancaFactory`
- optional `KEEPER_ADDRESS`

## Interaction Examples

### Read contract state

```bash
cast call <CONTRACT_ADDRESS> "functionName()" --rpc-url testnet
```

### Send a transaction

```bash
cast send <CONTRACT_ADDRESS> "functionName()" \
  --private-key $PRIVATE_KEY \
  --rpc-url testnet
```

### Mint test USDC

```bash
cast send <USDC_ADDRESS> "mint(address,uint256)" <RECIPIENT> 1000000e6 \
  --private-key $PRIVATE_KEY \
  --rpc-url testnet
```

## Hedera-Specific Notes

- `SancaPool` uses Hedera PRNG system contract `0x169` to derive winner order.
- `SancaPool` attempts HTS token association during initialization.
- `MockBonzoVault` exposes `associateToken(...)` to support HIP-719 style token association flows on Hedera.

## Security Notes

- `SancaPool` uses `ReentrancyGuard`
- token transfers use `SafeERC20`
- initialization is one-time only
- factory setters are owner-gated
- keeper actions are separated from member-facing deposit and withdrawal flows

## Useful Commands

```bash
forge --help
cast --help
anvil --help
```
