# Sanca Keeper Service

The Sanca Keeper Service is the off-chain intelligence layer behind Sanca's Bonzo-integrated yield strategy on Hedera.

For the Hedera Apex Hackathon, this service is aligned to:
- the `DeFi & Tokenization` main track through Sanca's ROSCA + yield architecture
- the `Bonzo` bounty through a single focused implementation: the `Volatility-Aware Rebalancer`

This service does not try to solve every bounty example. It intentionally implements only the first Bonzo bounty direction: an intelligent keeper agent that monitors `HBAR/USDC` volatility, reasons about vault conditions, and decides whether to `rebalance`, `collectFees`, or `noop`.

## Hackathon Alignment

### Sanca context

Sanca is a trustless ROSCA platform on Hedera. User collateral is deposited through `SancaPool`, forwarded into a Bonzo-like vault flow, and kept under pool-owned accounting. The keeper exists to improve how that vault position is managed after funds are deployed.

In other words:
- `SancaPool` remains the owner of the vault position
- the keeper does not bypass pool accounting
- the keeper only manages vault maintenance actions exposed by the pool

### Bonzo bounty alignment

This service directly addresses the Bonzo bounty problem statement by turning a static keeper into a decision-making agent:
- it reads live on-chain pool and vault state
- it builds a structured keeper context
- it consumes external market data for `HBAR/USDC`
- it asks an AI agent for a decision and reasoning
- it executes the resulting keeper action through `SancaPool`

The chosen implementation is the `Volatility-Aware Rebalancer`:
- `Low volatility`: tighten ranges to improve fee capture
- `High volatility`: widen ranges to reduce out-of-range risk and impermanent loss pressure
- `Extreme conditions`: prefer defensive range expansion rather than introducing synthetic strategy modes

### Explicit scope

Included in this implementation:
- volatility-aware CLMM maintenance for `HBAR/USDC`
- Bonzo-like vault interaction through `SancaPool`
- AI reasoning with Hedera Agent Kit runtime + Groq
- deterministic execution with `viem`
- oracle-style market input from SaucerSwap CLMM reads

Intentionally out of scope for this README and service:
- sentiment-based harvesting
- RAG/news ingestion
- intent-based conversational deposit UX
- multi-pair or multi-vault portfolio management

## How It Works

The keeper follows this flow:
1. Read all pools from `SancaFactory`
2. Build keeper context from `SancaPool`, vault state, and performance metrics
3. Fetch `HBAR/USDC` volatility context from SaucerSwap CLMM data on Hedera mainnet
4. Ask the AI decision layer to choose one action:
   - `rebalance`
   - `collectFees`
   - `noop`
5. Execute the selected action through `SancaPool`
6. Store decision history for observability and frontend display

This preserves the separation of concerns:
- `Hedera Agent Kit` is used for reasoning/runtime context
- `Groq` is used as the LLM decision engine
- `viem` is used for deterministic contract reads and writes

## Current Strategy Model

The current strategy is narrow by design:
- pair: `HBAR/USDC`
- vault style: Bonzo-like CLMM vault on testnet
- keeper actions: `rebalance`, `collectFees`, `noop`

The decision model combines:
- pool state from `SancaPool`
- vault state such as current tick, fee inventory, and current ranges
- realized volatility regime derived from SaucerSwap observations
- fallback policy rules when agent credentials are unavailable

The output of the agent is a structured JSON decision with:
- action
- reasoning
- rebalance parameters when needed

## Architecture

### Core modules

- `src/config.ts`: environment-driven runtime configuration
- `src/abi.ts`: contract ABI fragments used by the service
- `src/clients.ts`: Hedera-compatible `viem` clients and operator wiring
- `src/market.ts`: volatility signal generation and SaucerSwap reads
- `src/context.ts`: merged pool, vault, market, and performance context
- `src/decision-agent.ts`: Hedera Agent Kit + Groq decision engine
- `src/execution.ts`: deterministic on-chain execution via `viem`
- `src/history.ts`: in-memory decision history
- `src/keeper.ts`: orchestration for decision + execution
- `src/server.ts`: HTTP API and polling bootstrap

### Why this matches Sanca

This architecture fits Sanca because the product is not just "an AI bot for DeFi." It is an operational layer for Sanca's yield-bearing ROSCA pools:
- users join savings pools
- pool collateral is routed into a Bonzo-like vault
- the keeper manages the vault position in response to volatility
- users benefit from better range management without losing pool-level accounting integrity

## Setup

```bash
cd keeper-service
npm install
```

## Environment

```env
# Required for AI decisioning
ACCOUNT_ID=0.0.xxxxx
PRIVATE_KEY=0x...
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Optional runtime configuration
RPC_URL=https://testnet.hashio.io/api
MAINNET_RPC_URL=https://mainnet.hashio.io/api
FACTORY_ADDRESS=0x08a74CB8D0B398d9d6add0992085E488321Ef686
PORT=3002
POLL_INTERVAL_MS=3600000
KEEPER_STRATEGY_MODE=normal
KEEPER_PAIR=HBAR/USDC
SAUCERSWAP_POOL_ADDRESS=0xc5b707348da504e9be1bd4e21525459830e7b11d
KEEPER_SPOT_PRICE_BASE=0.081
KEEPER_FEE_COLLECTION_THRESHOLD=5000000
KEEPER_TICK_SPACING=60
KEEPER_DRIFT_REBALANCE_THRESHOLD=0.7
KEEPER_REBALANCE_RETRY_ATTEMPTS=3
VOL_LOW_THRESHOLD=0.12
VOL_MEDIUM_THRESHOLD=0.24
VOL_HIGH_THRESHOLD=0.38
```

Mode notes:

- `KEEPER_STRATEGY_MODE=normal` keeps the keeper conservative and closer to production behavior
- `KEEPER_STRATEGY_MODE=demo` lowers the default action thresholds so rebalance and fee collection happen more readily during demos
- `KEEPER_DRIFT_REBALANCE_THRESHOLD` can override the mode default if you want finer control

## Run

```bash
npm start
```

Development mode:

```bash
npm run dev
```

Type-check only:

```bash
npm run typecheck
```

## API Endpoints

- `GET /health` - basic health check
- `GET /config` - active config, model, thresholds, and runtime status
- `GET /api/volatility` - market signal for all pools or one pool via `?pool=0x...`
- `GET /api/keeper/context` - full merged keeper context
- `GET /api/keeper/decision` - current agent decision with fallback behavior
- `GET /api/keeper/decisions` - recent in-memory decision and execution history
- `POST /run` - manually trigger one keeper cycle
- `GET /pools` - high-level pool summary plus next keeper action

## Polling Behavior

The service runs on a configurable polling interval via `POLL_INTERVAL_MS`.

Each cycle:
- reads the current state of the tracked pools
- rebuilds keeper context
- calls the decision layer
- executes only when the chosen action is not `noop`

For volatility inputs, the service first tries to read SaucerSwap CLMM data from Hedera mainnet using `slot0()` and `observe()`. If those reads fail, it falls back to a seeded mock volatility signal so the architecture still works in demo environments.

## Implementation Notes

- `ACCOUNT_ID` is not derived automatically from the private key. Hedera operator setup requires the explicit account ID that owns the configured private key.
- The keeper executes through `SancaPool`, not directly against user accounting flows.
- The current oracle-style input uses SaucerSwap pool observations. This keeps the demo aligned with Bonzo's CLMM context while remaining testnet-friendly.
- The service is intentionally specialized. It is not a generic autonomous trading system.

## References

- [Hedera Hello Future Apex Hackathon 2026](https://hackathon.stackup.dev/web/events/hedera-hello-future-apex-hackathon-2026#bounties)
- [Bonzo Vaults Quickstart](https://docs.bonzo.finance/hub/bonzo-vaults-beta/bonzo-vaults-quickstart)
- [Hedera Agent Kit Overview](https://docs.hedera.com/hedera/open-source-solutions/ai-studio-on-hedera/hedera-ai-agent-kit)
- [Hedera Agent Kit JavaScript Quickstart](https://docs.hedera.com/hedera/open-source-solutions/ai-studio-on-hedera/hedera-ai-agent-kit/hedera-agent-kit-js/quickstart)
