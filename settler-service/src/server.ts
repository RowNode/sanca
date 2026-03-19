import express, { type Express, type Response } from "express";

import { config, hasExecutionConfig } from "./config.js";
import { ensureWatched, getActivePools, getSchedule, startRecoveryPolling, bootstrapWatchers, canAttemptSettle, attemptSettle, scheduleSettle } from "./settler.js";
import { poolsState } from "./state.js";
import type { PoolStatusResponse } from "./types.js";
import { asBigInt, nowSec } from "./utils.js";

function sendError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: message });
}

export function createServer(): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "settler" });
  });

  app.post("/settle", async (_req, res) => {
    try {
      const pools = await getActivePools();
      const attempted: string[] = [];

      for (const pool of pools) {
        await ensureWatched(pool);
        const ok = await canAttemptSettle(pool);
        if (ok) {
          attempted.push(pool);
          attemptSettle(pool).catch(() => undefined);
        }
      }

      res.json({ status: "ok", attemptedCount: attempted.length, attempted });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get("/pools", async (_req, res) => {
    try {
      const pools = await getActivePools();
      const results: PoolStatusResponse[] = [];

      for (const pool of pools) {
        await ensureWatched(pool);
        const schedule = await getSchedule(pool);
        const runtimeState = poolsState.get(pool) || { retries: 0, timer: null };
        poolsState.set(pool, runtimeState);

        if (!runtimeState.nextSettleAtSec && asBigInt(schedule.state) === 1n && !schedule.completed) {
          scheduleSettle(pool, schedule.settleAt);
        }

        const derivedCanSettle =
          asBigInt(schedule.state) === 1n && !schedule.completed && nowSec() >= schedule.settleAt;

        results.push({
          address: pool,
          canSettle: derivedCanSettle,
          state: schedule.state.toString(),
          currentCycle: schedule.currentCycle.toString(),
          completed: Boolean(schedule.completed),
          nowSec: nowSec().toString(),
          settleAtSec: schedule.settleAt.toString(),
          nextSettleAtSec: runtimeState.nextSettleAtSec?.toString?.() ?? null,
          retries: runtimeState.retries ?? 0,
        });
      }

      res.json({ pools: results, count: results.length });
    } catch (err) {
      sendError(res, err);
    }
  });

  return app;
}

export function startServer(): void {
  const app = createServer();

  app.listen(config.port, () => {
    console.log(`[Settler] Service listening on port ${config.port}`);
    console.log(`[Settler] Watch polling interval: ${config.watchPollingIntervalMs}ms`);
    console.log(`[Settler] Recovery poll interval: ${config.pollIntervalMs}ms`);

    if (!hasExecutionConfig()) {
      console.warn("[Settler] No PRIVATE_KEY_SETTLER or PRIVATE_KEY - settlements will fail");
    }

    bootstrapWatchers().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Settler] bootstrapWatchers error:", message);
    });
    startRecoveryPolling();
  });
}
