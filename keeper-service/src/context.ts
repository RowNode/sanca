import { MockBonzoVaultAbi, SancaFactoryAbi, SancaPoolAbi } from "./abi.js";
import { publicClient } from "./clients.js";
import { config } from "./config.js";
import { buildVolatilitySignal, safeReadContract } from "./market.js";
import type { HexAddress, KeeperContext, PerformanceMetrics, PoolState } from "./types.js";
import { asBigInt, clamp, toNumber } from "./utils.js";

type PoolInfoTuple = readonly [
  number | bigint,
  number | bigint,
  bigint,
  bigint,
  bigint,
  number | bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
];

function poolStateLabel(state: number): PoolState {
  if (state === 1) return "Active";
  if (state === 2) return "Completed";
  return "Open";
}

function buildPerformanceMetrics({
  totalAssets,
  totalDeposited,
  pendingFeeAssets,
  rebalanceCount,
}: {
  totalAssets: bigint;
  totalDeposited: bigint;
  pendingFeeAssets: bigint;
  rebalanceCount: bigint;
}): PerformanceMetrics {
  const principal = totalDeposited > 0n ? totalDeposited : totalAssets;
  const growth = totalAssets > principal ? totalAssets - principal : 0n;
  const principalFloat = principal > 0n ? Number(principal) : 0;
  const growthRatio = principalFloat > 0 ? Number(growth) / principalFloat : 0;
  const realizedApy7d = Number(clamp(growthRatio * 18, 0, 150).toFixed(2));
  const realizedApy30d = Number(clamp(growthRatio * 12, 0, 120).toFixed(2));
  const displayApy7d = realizedApy7d > 0 ? realizedApy7d : config.mockApy;
  const displayApy30d = realizedApy30d > 0 ? realizedApy30d : config.mockApy;

  return {
    vaultTvlUsd: Number(toNumber(totalAssets, 1e6).toFixed(2)),
    principalUsd: Number(toNumber(principal, 1e6).toFixed(2)),
    accumulatedYieldUsd: Number(toNumber(growth, 1e6).toFixed(2)),
    recentFeesCollectedUsd: Number(toNumber(pendingFeeAssets, 1e6).toFixed(2)),
    apy7d: displayApy7d,
    apy30d: displayApy30d,
    rebalanceCount: Number(rebalanceCount),
  };
}

export async function getAllPools(): Promise<HexAddress[]> {
  const pools = (await publicClient.readContract({
    address: config.factoryAddress,
    abi: SancaFactoryAbi,
    functionName: "getAllPools",
    args: [],
  })) as HexAddress[] | undefined;

  return pools || [];
}

export async function getTargetPools(poolAddress?: string | string[]): Promise<HexAddress[]> {
  const value = Array.isArray(poolAddress) ? poolAddress[0] : poolAddress;
  if (value) return [value as HexAddress];
  return getAllPools();
}

export async function buildKeeperContext(poolAddress: HexAddress): Promise<KeeperContext> {
  const [poolInfo, totalDeposited, keeperAddress, vaultAddress, poolName, poolDescription] =
    await Promise.all([
      publicClient.readContract({
        address: poolAddress,
        abi: SancaPoolAbi,
        functionName: "getPoolInfo",
      }) as Promise<PoolInfoTuple>,
      publicClient.readContract({
        address: poolAddress,
        abi: SancaPoolAbi,
        functionName: "totalDeposited",
      }) as Promise<bigint>,
      safeReadContract({
        address: poolAddress,
        abi: SancaPoolAbi,
        functionName: "keeper",
        fallbackValue: "0x0000000000000000000000000000000000000000" as HexAddress,
      }),
      publicClient.readContract({
        address: poolAddress,
        abi: SancaPoolAbi,
        functionName: "bonzoVault",
      }) as Promise<HexAddress>,
      safeReadContract({
        address: poolAddress,
        abi: SancaPoolAbi,
        functionName: "poolName",
        fallbackValue: "Sanca Pool",
      }),
      safeReadContract({
        address: poolAddress,
        abi: SancaPoolAbi,
        functionName: "poolDescription",
        fallbackValue: "",
      }),
    ]);

  const [
    rawState,
    maxMembers,
    currentMembers,
    contributionPerPeriod,
    periodDuration,
    yieldBonusSplit,
    currentCycle,
    totalCycles,
    cycleStartTime,
    vaultShares,
    vaultTotalAssets,
  ] = poolInfo;

  const [
    totalAssets,
    currentTick,
    baseLower,
    baseUpper,
    limitLower,
    limitUpper,
    pendingFeeAssets,
    rebalanceCount,
    lastRebalanceAt,
  ] = await Promise.all([
    safeReadContract({
      address: vaultAddress,
      abi: MockBonzoVaultAbi,
      functionName: "totalAssets",
      fallbackValue: vaultTotalAssets,
    }),
    safeReadContract({
      address: vaultAddress,
      abi: MockBonzoVaultAbi,
      functionName: "currentTick",
      fallbackValue: 0,
    }),
    safeReadContract({
      address: vaultAddress,
      abi: MockBonzoVaultAbi,
      functionName: "baseLower",
      fallbackValue: -120,
    }),
    safeReadContract({
      address: vaultAddress,
      abi: MockBonzoVaultAbi,
      functionName: "baseUpper",
      fallbackValue: 120,
    }),
    safeReadContract({
      address: vaultAddress,
      abi: MockBonzoVaultAbi,
      functionName: "limitLower",
      fallbackValue: -360,
    }),
    safeReadContract({
      address: vaultAddress,
      abi: MockBonzoVaultAbi,
      functionName: "limitUpper",
      fallbackValue: 360,
    }),
    safeReadContract({
      address: vaultAddress,
      abi: MockBonzoVaultAbi,
      functionName: "pendingFeeAssets",
      fallbackValue: 0n,
    }),
    safeReadContract({
      address: vaultAddress,
      abi: MockBonzoVaultAbi,
      functionName: "rebalanceCount",
      fallbackValue: 0n,
    }),
    safeReadContract({
      address: vaultAddress,
      abi: MockBonzoVaultAbi,
      functionName: "lastRebalanceAt",
      fallbackValue: 0n,
    }),
  ]);

  const market = await buildVolatilitySignal(poolAddress);
  const performance = buildPerformanceMetrics({
    totalAssets: asBigInt(totalAssets),
    totalDeposited: asBigInt(totalDeposited),
    pendingFeeAssets: asBigInt(pendingFeeAssets),
    rebalanceCount: asBigInt(rebalanceCount),
  });

  return {
    pool: {
      address: poolAddress,
      name: String(poolName),
      description: String(poolDescription),
      keeper: keeperAddress,
      state: poolStateLabel(Number(rawState)),
      stateCode: Number(rawState),
      maxMembers: Number(maxMembers),
      currentMembers: Number(currentMembers),
      contributionPerPeriod: asBigInt(contributionPerPeriod),
      periodDuration: asBigInt(periodDuration),
      yieldBonusSplit: Number(yieldBonusSplit),
      currentCycle: asBigInt(currentCycle),
      totalCycles: asBigInt(totalCycles),
      cycleStartTime: asBigInt(cycleStartTime),
      totalDeposited: asBigInt(totalDeposited),
    },
    vault: {
      address: vaultAddress,
      vaultShares: asBigInt(vaultShares),
      totalAssets: asBigInt(totalAssets),
      vaultTvlUsd: performance.vaultTvlUsd,
      currentTick: Number(currentTick),
      baseLower: Number(baseLower),
      baseUpper: Number(baseUpper),
      limitLower: Number(limitLower),
      limitUpper: Number(limitUpper),
      pendingFeeAssets: asBigInt(pendingFeeAssets),
      rebalanceCount: asBigInt(rebalanceCount),
      lastRebalanceAt: asBigInt(lastRebalanceAt),
    },
    performance,
    market,
  };
}
