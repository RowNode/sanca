"use client";

import {
  fetchPoolDetail,
  type Pool,
  type Member,
  type Cycle,
  type CycleContribution,
} from "@/lib/indexer";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useIndexerSnapshot } from "@/hooks/useIndexerSnapshot";
import { useKeeperSummaryMap } from "@/hooks/useKeeper";

/**
 * Hook untuk get semua pools dengan filter
 */
export function usePools(options?: {
  state?: "Open" | "Active" | "Completed";
  limit?: number;
}) {
  const snapshotQuery = useIndexerSnapshot();
  const keeperSummaryQuery = useKeeperSummaryMap();

  const data = useMemo(() => {
    if (!snapshotQuery.data) return undefined;

    let pools = [...snapshotQuery.data.pools].map((pool) => {
      const keeperSummary = keeperSummaryQuery.data?.get(pool.id.toLowerCase());
      if (!keeperSummary) return pool;

      return {
        ...pool,
        keeperApy7d: keeperSummary.apy7d,
        keeperApy30d: keeperSummary.apy30d,
        keeperVaultTvlUsd: keeperSummary.vaultTvlUsd,
        keeperAccumulatedYieldUsd: keeperSummary.accumulatedYieldUsd,
        keeperRecentFeesCollectedUsd: keeperSummary.recentFeesCollectedUsd,
        keeperVolatilityRegime: keeperSummary.volatilityRegime,
        keeperNextAction: keeperSummary.nextAction,
        keeperDecisionSource: keeperSummary.decisionSource,
      };
    });

    if (options?.state) {
      pools = pools.filter((pool) => pool.state === options.state);
    }

    pools.sort((a, b) => Number(b.createdAtTimestamp - a.createdAtTimestamp));

    if (options?.limit) {
      pools = pools.slice(0, options.limit);
    }

    return pools;
  }, [keeperSummaryQuery.data, options, snapshotQuery.data]);

  return {
    ...snapshotQuery,
    isKeeperLoading: keeperSummaryQuery.isLoading,
    data,
  };
}

/**
 * Hook untuk get pool detail dengan members & cycles
 */
export function usePoolDetail(poolId: string | null) {
  return useQuery({
    queryKey: ["pool", poolId],
    queryFn: async () => {
      if (!poolId) return null;

      const data = await fetchPoolDetail(poolId);

      return {
        pool: data.pool,
        members: [...data.members].sort(
          (a: Member, b: Member) =>
            Number(a.joinedAtTimestamp - b.joinedAtTimestamp),
        ),
        cycles: [...data.cycles].sort((a: Cycle, b: Cycle) => a.index - b.index),
        cycleContributions: [...data.cycleContributions].sort(
          (a: CycleContribution, b: CycleContribution) => {
            if (a.cycleIndex !== b.cycleIndex) {
              return a.cycleIndex - b.cycleIndex;
            }
            return Number(a.createdAtTimestamp - b.createdAtTimestamp);
          },
        ),
      };
    },
    enabled: !!poolId,
    refetchInterval: 10000,
  });
}

/**
 * Hook untuk get pools milik user yang sedang connect
 */
export function useUserPools() {
  const { address } = useAccount();
  const poolsQuery = usePools();
  const snapshotQuery = useIndexerSnapshot();

  const mergedData = useMemo(() => {
    if (!address || !snapshotQuery.data) return [];

    const userMembers = snapshotQuery.data.members.filter(
      (member) => member.address.toLowerCase() === address.toLowerCase(),
    );
    const poolsMap = new Map((poolsQuery.data ?? []).map((pool) => [pool.id.toLowerCase(), pool]));

    return userMembers
      .map((member) => {
        const pool = poolsMap.get(member.poolId.toLowerCase());
        if (!pool) return null;

        return {
          ...pool,
          userContribution: member.contribution,
          userJoinedAt: member.joinedAtTimestamp,
        };
      })
      .filter((pool): pool is NonNullable<typeof pool> => pool !== null);
  }, [address, poolsQuery.data, snapshotQuery.data]);

  return {
    ...snapshotQuery,
    isKeeperLoading: poolsQuery.isKeeperLoading,
    data: mergedData,
  };
}

