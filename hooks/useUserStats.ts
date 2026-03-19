"use client";

import { useAccount } from "wagmi";
import { useMemo } from "react";

import { useIndexerSnapshot } from "@/hooks/useIndexerSnapshot";

/**
 * Hook untuk get user stats (total contributed, received, pending, etc)
 */
export function useUserStats() {
  const { address } = useAccount();
  const snapshotQuery = useIndexerSnapshot();

  const data = useMemo(() => {
    if (!address || !snapshotQuery.data) {
      return {
        totalContributed: 0,
        totalReceived: 0,
        pendingPayouts: 0,
        totalPools: 0,
        activePools: 0,
        completedPools: 0,
      };
    }

    const userMembers = snapshotQuery.data.members.filter(
      (member) => member.address.toLowerCase() === address.toLowerCase(),
    );
    const userPoolIds = new Set(userMembers.map((member) => member.poolId.toLowerCase()));
    const userPools = snapshotQuery.data.pools.filter((pool) =>
      userPoolIds.has(pool.id.toLowerCase()),
    );
    const userCycles = snapshotQuery.data.cycles.filter((cycle) =>
      userPoolIds.has(cycle.poolId.toLowerCase()),
    );
    const userContributions = snapshotQuery.data.cycleContributions.filter(
      (contribution) =>
        contribution.memberAddress.toLowerCase() === address.toLowerCase(),
    );

    let totalContributed = 0;
    userMembers.forEach((member) => {
      totalContributed += Number(member.contribution) / 1e6;
    });
    userContributions.forEach((contribution) => {
      if (!contribution.isLiquidated) {
        totalContributed += Number(contribution.amount) / 1e6;
      }
    });

    let totalReceived = 0;
    userCycles.forEach((cycle) => {
      if (cycle.winner.toLowerCase() === address.toLowerCase()) {
        totalReceived += Number(cycle.prize) / 1e6;
      }
    });

    let pendingPayouts = 0;
    const activePools = userPools.filter((pool) => pool.state === "Active");
    activePools.forEach((pool) => {
      const poolCycles = userCycles.filter(
        (cycle) => cycle.poolId.toLowerCase() === pool.id.toLowerCase(),
      );
      const userWon = poolCycles.some(
        (cycle) => cycle.winner.toLowerCase() === address.toLowerCase(),
      );

      if (!userWon) {
        pendingPayouts +=
          (Number(pool.contributionPerPeriod) / 1e6) * pool.maxMembers;
      }
    });

    return {
      totalContributed,
      totalReceived,
      pendingPayouts,
      totalPools: userPools.length,
      activePools: activePools.length,
      completedPools: userPools.filter((pool) => pool.state === "Completed").length,
    };
  }, [address, snapshotQuery.data]);

  return {
    ...snapshotQuery,
    data,
  };
}

