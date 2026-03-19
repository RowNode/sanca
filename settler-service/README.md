# Sanca Settler Service

The Sanca Settler Service is the off-chain watcher and scheduler responsible for calling `settleCycle()` as soon as a pool becomes time-eligible.

It is designed to be:
- event-aware
- recovery-friendly
- continuously running

## What It Does

The service applies time-based gating only:
- pool state must be `Active`
- the cycle must have reached `cycleStartTime + periodDuration`
- the current cycle must not already be completed

If a pool is still not settleable at execution time, the transaction can revert. In that case, the service retries later using backoff and recovery polling.

## Setup

```bash
cd settler-service
npm install
```

## Environment

```env
# Required: private key for the account that calls settleCycle()
PRIVATE_KEY_SETTLER=0x...

# Or reuse the generic PRIVATE_KEY
PRIVATE_KEY=0x...

# Optional runtime config
RPC_URL=https://testnet.hashio.io/api
FACTORY_ADDRESS=0x08a74CB8D0B398d9d6add0992085E488321Ef686
PORT=3001
POLL_INTERVAL_MS=60000
WATCH_POLLING_INTERVAL_MS=2000
LOG_LEVEL=info
```

## Run

Start the service:

```bash
npm start
```

Start in development mode with auto-reload:

```bash
npm run dev
```

Run type-check only:

```bash
npm run typecheck
```

## API Endpoints

- `GET /health` - health check
- `POST /settle` - manually trigger a settle scan
- `GET /pools` - list tracked pools and their current settleability

## Polling Model

The service uses two mechanisms:

### 1. Watchers

Event watchers are used to react quickly to:
- `PoolCreated`
- `PoolStarted`
- `CycleEnded`
- `PoolCompleted`

Watcher polling interval is controlled by `WATCH_POLLING_INTERVAL_MS`.

### 2. Recovery Poll

A recovery poll runs every `POLL_INTERVAL_MS` to:
- rebuild missing timers after restart
- resync state if an event is missed
- ensure each active pool stays scheduled correctly

## Project Structure

The service is modularized into:
- `src/config.ts` - environment variables and runtime constants
- `src/abi.ts` - contract ABI fragments
- `src/clients.ts` - `viem` public and wallet clients
- `src/state.ts` - in-memory pool watcher state and timers
- `src/settler.ts` - scheduler, watchers, retry logic, and settle orchestration
- `src/server.ts` - HTTP server and bootstrap logic

## Notes

- The service is intentionally specialized for `settleCycle()` timing, not for general keeper actions.
- If neither `PRIVATE_KEY_SETTLER` nor `PRIVATE_KEY` is set, the service can still observe pools but settlement transactions will fail.
- This service complements `keeper-service`; it does not replace keeper logic.
