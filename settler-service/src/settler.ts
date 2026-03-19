import { SancaFactoryAbi, SancaPoolAbi } from "./abi.js";
import { publicClient, walletClient } from "./clients.js";
import { config } from "./config.js";
import { clearPoolTimer, getOrCreatePoolState, poolsState, unwatchers } from "./state.js";
import type { HexAddress, PoolRuntimeState, PoolSchedule } from "./types.js";
import { asBigInt, isLikelyRevert, nowSec, sleep } from "./utils.js";

let recoveryPollTimer: NodeJS.Timeout | null = null;

export async function getActivePools(): Promise<HexAddress[]> {
  const pools = (await publicClient.readContract({
    address: config.factoryAddress,
    abi: SancaFactoryAbi,
    functionName: "getAllPools",
    args: [],
  })) as HexAddress[] | undefined;
  return pools || [];
}

export async function settlePool(poolAddress: HexAddress): Promise<HexAddress> {
  if (!walletClient) throw new Error("No wallet configured");

  const hash = await walletClient.writeContract({
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "settleCycle",
    args: [],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function canAttemptSettle(poolAddress: HexAddress): Promise<boolean> {
  const currentTime = nowSec();
  const rawState = (await publicClient.readContract({
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "state",
  })) as number | bigint;

  if (asBigInt(rawState) !== 1n) return false;

  const currentCycle = (await publicClient.readContract({
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "currentCycle",
    args: [],
  })) as bigint;

  const [cycleStartTime, periodDuration, completed] = (await Promise.all([
    publicClient.readContract({
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "cycleStartTime",
    }),
    publicClient.readContract({
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "periodDuration",
    }),
    publicClient.readContract({
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "cycleCompleted",
      args: [currentCycle],
    }),
  ])) as [bigint, bigint, boolean];

  if (completed) return false;
  if (currentTime < cycleStartTime + periodDuration) return false;
  return true;
}

export async function getSchedule(poolAddress: HexAddress): Promise<PoolSchedule> {
  const currentCycle = (await publicClient.readContract({
    address: poolAddress,
    abi: SancaPoolAbi,
    functionName: "currentCycle",
  })) as bigint;

  const [rawState, cycleStartTime, periodDuration, completed] = (await Promise.all([
    publicClient.readContract({
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "state",
    }),
    publicClient.readContract({
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "cycleStartTime",
    }),
    publicClient.readContract({
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "periodDuration",
    }),
    publicClient.readContract({
      address: poolAddress,
      abi: SancaPoolAbi,
      functionName: "cycleCompleted",
      args: [currentCycle],
    }),
  ])) as [number | bigint, bigint, bigint, boolean];

  return {
    state: asBigInt(rawState),
    currentCycle,
    cycleStartTime,
    periodDuration,
    completed,
    settleAt: cycleStartTime + periodDuration,
  };
}

export function scheduleSettle(poolAddress: HexAddress, settleAtSec: bigint): void {
  const poolState = getOrCreatePoolState(poolAddress);
  clearPoolTimer(poolAddress);

  const delayMs = Math.max(0, Number(settleAtSec - nowSec()) * 1000);
  poolState.nextSettleAtSec = settleAtSec;
  poolsState.set(poolAddress, poolState);

  if (config.logLevel === "debug") {
    const etaSec = settleAtSec > nowSec() ? Number(settleAtSec - nowSec()) : 0;
    console.log(`[Settler] Scheduled ${poolAddress} at=${settleAtSec.toString()} (in ${etaSec}s)`);
  }

  poolState.timer = setTimeout(() => {
    attemptSettle(poolAddress).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Settler] attemptSettle error ${poolAddress}:`, message);
    });
  }, delayMs);
}

export async function attemptSettle(poolAddress: HexAddress): Promise<void> {
  if (!walletClient) {
    console.warn("[Settler] No PRIVATE_KEY_SETTLER/PRIVATE_KEY - cannot settle");
    return;
  }

  const poolState = getOrCreatePoolState(poolAddress);
  poolsState.set(poolAddress, poolState);

  const schedule = await getSchedule(poolAddress);
  if (asBigInt(schedule.state) !== 1n || schedule.completed) {
    clearPoolTimer(poolAddress);
    return;
  }

  if (nowSec() < schedule.settleAt) {
    scheduleSettle(poolAddress, schedule.settleAt);
    return;
  }

  try {
    console.log(
      `[Settler] Attempting settle pool=${poolAddress} cycle=${schedule.currentCycle.toString()} now=${nowSec().toString()} settleAt=${schedule.settleAt.toString()}`,
    );
    const hash = await settlePool(poolAddress);
    console.log(`[Settler] Settled pool ${poolAddress} tx=${hash}`);
    poolState.retries = 0;
    poolState.currentCycle = schedule.currentCycle;

    await sleep(1500);
    const next = await getSchedule(poolAddress);
    if (next.state === 1n && !next.completed) {
      scheduleSettle(poolAddress, next.settleAt);
    } else {
      clearPoolTimer(poolAddress);
    }
  } catch (err) {
    if (!isLikelyRevert(err)) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Settler] Non-revert error ${poolAddress}:`, message);
    }
    poolState.retries = (poolState.retries || 0) + 1;
    const backoffMs = Math.min(120000, 5000 * 2 ** Math.min(5, poolState.retries - 1));
    poolState.nextSettleAtSec = nowSec() + BigInt(Math.ceil(backoffMs / 1000));
    scheduleSettle(poolAddress, poolState.nextSettleAtSec);
  }
}

async function rescheduleFromChain(poolAddress: HexAddress): Promise<void> {
  const schedule = await getSchedule(poolAddress);
  if (asBigInt(schedule.state) === 1n && !schedule.completed) {
    scheduleSettle(poolAddress, schedule.settleAt);
  } else {
    clearPoolTimer(poolAddress);
  }
}

export async function ensureWatched(poolAddress: HexAddress): Promise<void> {
  if (poolsState.has(poolAddress)) return;
  poolsState.set(poolAddress, { retries: 0, timer: null });

  try {
    const schedule = await getSchedule(poolAddress);
    if (asBigInt(schedule.state) === 1n && !schedule.completed) {
      scheduleSettle(poolAddress, schedule.settleAt);
      if (nowSec() >= schedule.settleAt) {
        attemptSettle(poolAddress).catch(() => undefined);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Settler] Failed to schedule ${poolAddress}:`, message);
  }

  const watchClient = publicClient as any;

  const unwatchCycleEnded = watchClient.watchEvent({
    address: poolAddress,
    abi: SancaPoolAbi,
    eventName: "CycleEnded",
    pollingInterval: config.watchPollingIntervalMs,
    onLogs: async () => {
      try {
        await rescheduleFromChain(poolAddress);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Settler] CycleEnded reschedule error ${poolAddress}:`, message);
      }
    },
  });
  unwatchers.push(unwatchCycleEnded as () => void);

  const unwatchCompleted = watchClient.watchEvent({
    address: poolAddress,
    abi: SancaPoolAbi,
    eventName: "PoolCompleted",
    pollingInterval: config.watchPollingIntervalMs,
    onLogs: async () => {
      clearPoolTimer(poolAddress);
    },
  });
  unwatchers.push(unwatchCompleted as () => void);

  const unwatchStarted = watchClient.watchEvent({
    address: poolAddress,
    abi: SancaPoolAbi,
    eventName: "PoolStarted",
    pollingInterval: config.watchPollingIntervalMs,
    onLogs: async () => {
      try {
        await rescheduleFromChain(poolAddress);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Settler] PoolStarted reschedule error ${poolAddress}:`, message);
      }
    },
  });
  unwatchers.push(unwatchStarted as () => void);
}

export async function bootstrapWatchers(): Promise<void> {
  const watchClient = publicClient as any;

  const unwatchFactory = watchClient.watchEvent({
    address: config.factoryAddress,
    abi: SancaFactoryAbi,
    eventName: "PoolCreated",
    pollingInterval: config.watchPollingIntervalMs,
    onLogs: async (logs: any[]) => {
      for (const log of logs) {
        const pool = log?.args?.pool as HexAddress | undefined;
        if (pool) {
          console.log(`[Settler] New pool detected ${pool}`);
          await ensureWatched(pool);
        }
      }
    },
  });
  unwatchers.push(unwatchFactory as () => void);

  const pools = await getActivePools();
  for (const pool of pools) {
    await ensureWatched(pool);
  }

  console.log(`[Settler] Watching ${pools.length} pools:`);
  for (const pool of pools) {
    try {
      const schedule = await getSchedule(pool);
      const settleAt = schedule.settleAt;
      const eta = settleAt > nowSec() ? Number(settleAt - nowSec()) : 0;
      console.log(
        `  - ${pool} state=${schedule.state.toString()} cycle=${schedule.currentCycle.toString()} settleAt=${settleAt.toString()} (in ${eta}s)`,
      );
      if (nowSec() >= settleAt && asBigInt(schedule.state) === 1n && !schedule.completed) {
        attemptSettle(pool).catch(() => undefined);
      }
    } catch (_err) {
      console.log(`  - ${pool} (schedule read failed)`);
    }
  }
}

export function startRecoveryPolling(): void {
  if (recoveryPollTimer) {
    clearInterval(recoveryPollTimer);
    recoveryPollTimer = null;
  }

  const tick = async (): Promise<void> => {
    try {
      const pools = await getActivePools();
      for (const pool of pools) {
        await ensureWatched(pool);
        const schedule = await getSchedule(pool);
        if (asBigInt(schedule.state) === 1n && !schedule.completed) {
          const poolState: PoolRuntimeState | undefined = poolsState.get(pool);
          if (!poolState?.nextSettleAtSec || poolState.nextSettleAtSec !== schedule.settleAt) {
            scheduleSettle(pool, schedule.settleAt);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Settler] Recovery poll error:", message);
    }
  };

  tick().catch((err: unknown) => console.error("[Settler] Recovery poll error:", err));
  recoveryPollTimer = setInterval(() => {
    tick().catch((err: unknown) => console.error("[Settler] Recovery poll error:", err));
  }, config.pollIntervalMs);
}
