import express, { type Express, type Request, type Response } from "express";

import { buildKeeperContext, getAllPools, getTargetPools } from "./context.js";
import { config, hasDecisionAgentConfig, hasExecutionConfig } from "./config.js";
import { listDecisions } from "./history.js";
import { buildDecisionForPool, runKeeper } from "./keeper.js";
import { buildVolatilitySignal } from "./market.js";
import { serializeJson } from "./utils.js";

let pollTimer: NodeJS.Timeout | null = null;

function getQueryValue(value: Request["query"][string]): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first : undefined;
}

function startPolling(): void {
  runKeeper().catch((err: unknown) => console.error("[Keeper] Poll error:", err));
  pollTimer = setInterval(() => {
    runKeeper().catch((err: unknown) => console.error("[Keeper] Poll error:", err));
  }, config.pollIntervalMs);
}

function sendError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: message });
}

export function createServer(): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "keeper" });
  });

  app.get("/config", (_req, res) => {
    res.json({
      pollIntervalMs: config.pollIntervalMs,
      pair: config.pairLabel,
      agent: {
        hederaAgentKitConfigured: hasDecisionAgentConfig(),
        provider: "groq",
        model: hasDecisionAgentConfig() ? config.groqModel : null,
        accountId: config.accountId || null,
      },
      execution: {
        viemConfigured: hasExecutionConfig(),
        provider: "viem",
      },
      mainnetRpcUrl: config.mainnetRpcUrl,
      saucerswapPoolAddress: config.saucerswapPoolAddress,
      spotPriceBase: config.spotPriceBase,
      feeCollectionThreshold: config.feeCollectionThreshold.toString(),
      volatilityThresholds: config.volatilityThresholds,
      regimeProfiles: config.regimeProfiles,
    });
  });

  app.get("/api/volatility", async (req, res) => {
    try {
      const pool = getQueryValue(req.query.pool);
      const pools = await getTargetPools(pool);
      const items = await Promise.all(
        pools.map(async (address) => ({
          pool: address,
          market: await buildVolatilitySignal(address),
        })),
      );
      res.json(serializeJson(pool ? items[0] : { items, count: items.length }));
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get("/api/keeper/context", async (req, res) => {
    try {
      const pool = getQueryValue(req.query.pool);
      const pools = await getTargetPools(pool);
      const items = await Promise.all(pools.map((address) => buildKeeperContext(address)));
      res.json(serializeJson(pool ? items[0] : { items, count: items.length }));
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get("/api/keeper/decision", async (req, res) => {
    try {
      const pool = getQueryValue(req.query.pool);
      const pools = await getTargetPools(pool);
      const items = await Promise.all(
        pools.map(async (address) => {
          const { context, decision } = await buildDecisionForPool(address);
          return {
            pool: address,
            market: context.market,
            performance: context.performance,
            decision,
          };
        }),
      );
      res.json(serializeJson(pool ? items[0] : { items, count: items.length }));
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get("/api/keeper/decisions", (req, res) => {
    const items = listDecisions(getQueryValue(req.query.pool));
    res.json(serializeJson({ items, count: items.length }));
  });

  app.post("/run", async (_req, res) => {
    try {
      const summary = await runKeeper();
      res.json(serializeJson({ status: "ok", summary }));
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get("/pools", async (_req, res) => {
    try {
      const pools = await getAllPools();
      const items = await Promise.all(
        pools.map(async (address) => {
          const { decision, context } = await buildDecisionForPool(address);
          return {
            address,
            state: context.pool.state,
            currentCycle: context.pool.currentCycle,
            totalDeposited: context.pool.totalDeposited,
            vaultTvlUsd: context.performance.vaultTvlUsd,
            apy7d: context.performance.apy7d,
            apy30d: context.performance.apy30d,
            accumulatedYieldUsd: context.performance.accumulatedYieldUsd,
            recentFeesCollectedUsd: context.performance.recentFeesCollectedUsd,
            volatilityRegime: context.market.volatilityRegime,
            nextAction: decision.action,
            decisionSource: decision.source,
          };
        }),
      );
      res.json(serializeJson({ pools: items, count: items.length }));
    } catch (err) {
      sendError(res, err);
    }
  });

  return app;
}

export function startServer(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  const app = createServer();
  app.listen(config.port, () => {
    console.log(`[Keeper] Service listening on port ${config.port}`);
    console.log(`[Keeper] Poll interval: ${config.pollIntervalMs}ms`);
    if (!hasExecutionConfig()) {
      console.warn("[Keeper] No PRIVATE_KEY - keeper operations will fail");
    }
    if (!hasDecisionAgentConfig()) {
      console.warn("[Keeper] No decision agent config - falling back to rules");
    }
    startPolling();
  });
}
