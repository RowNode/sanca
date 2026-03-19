import { buildKeeperContext, getAllPools } from "./context.js";
import { buildDecisionForContext } from "./decision-agent.js";
import { canExecuteTransactions, executeKeeperAction, isLikelyRevert } from "./execution.js";
import { recordDecision } from "./history.js";
import type { HexAddress, KeeperContext, KeeperDecision, KeeperRunSummary } from "./types.js";

export async function buildDecisionForPool(
  poolAddress: HexAddress,
): Promise<{ context: KeeperContext; decision: KeeperDecision }> {
  const context = await buildKeeperContext(poolAddress);
  const decision = await buildDecisionForContext(context);
  return { context, decision };
}

export async function runKeeper(): Promise<KeeperRunSummary> {
  if (!canExecuteTransactions()) {
    console.warn("[Keeper] No execution client configured - skipping");
    return { poolsChecked: 0, rebalanced: 0, feesCollected: 0, noops: 0 };
  }

  const pools = await getAllPools();
  let rebalanced = 0;
  let feesCollected = 0;
  let noops = 0;

  for (const pool of pools) {
    let latestContext: KeeperContext | null = null;
    let latestDecision: KeeperDecision | null = null;

    try {
      const context = await buildKeeperContext(pool);
      latestContext = context;

      if (context.pool.state !== "Active") {
        continue;
      }

      const decision = await buildDecisionForContext(context);
      latestDecision = decision;

      if (decision.action === "noop") {
        noops += 1;
        recordDecision({
          pool,
          action: "noop",
          status: "skipped",
          txHash: null,
          executionProvider: null,
          reasoning: decision.reasoning,
          params: null,
          regime: context.market.volatilityRegime,
          decisionSource: decision.source,
        });
        continue;
      }

      const { txHash, executionProvider } = await executeKeeperAction({
        poolAddress: pool,
        decision: decision.action,
        params: decision.params,
      });

      if (decision.action === "collectFees") {
        feesCollected += 1;
        console.log(`[Keeper] Collected fees pool ${pool} tx=${txHash} via=${executionProvider}`);
      } else {
        rebalanced += 1;
        console.log(`[Keeper] Rebalanced pool ${pool} tx=${txHash} via=${executionProvider}`);
      }

      recordDecision({
        pool,
        action: decision.action,
        status: "executed",
        txHash,
        executionProvider,
        reasoning: decision.reasoning,
        params: decision.params,
        regime: context.market.volatilityRegime,
        decisionSource: decision.source,
      });
    } catch (err) {
      const error = err as { shortMessage?: string; message?: string };
      const message = error?.shortMessage || error?.message || String(err);
      if (!isLikelyRevert(err)) {
        console.error(`[Keeper] Error for pool ${pool}:`, message);
      }
      recordDecision({
        pool: pool as HexAddress,
        action: latestDecision?.action || "unknown",
        status: "failed",
        txHash: null,
        executionProvider: "viem",
        reasoning: latestDecision?.reasoning || ["Decision execution failed."],
        params: latestDecision?.params || null,
        regime: latestContext?.market?.volatilityRegime || null,
        decisionSource: latestDecision?.source || "unknown",
        error: message,
      });
    }
  }

  if (pools.length === 0) {
    console.log("[Keeper] No pools found");
  } else if (rebalanced === 0 && feesCollected === 0) {
    console.log(`[Keeper] Checked ${pools.length} pools, no execution needed`);
  }

  return { poolsChecked: pools.length, rebalanced, feesCollected, noops };
}
