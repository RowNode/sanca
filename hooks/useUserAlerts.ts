"use client";

import { useAccount } from "wagmi";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

import { useIndexerSnapshot } from "@/hooks/useIndexerSnapshot";

export interface UserAlert {
  id: string;
  type: "reminder" | "success" | "warning";
  title: string;
  message: string;
  poolId?: string;
}

/**
 * Hook untuk get user alerts (reminders, notifications, etc)
 */
export function useUserAlerts() {
  const { address } = useAccount();
  const snapshotQuery = useIndexerSnapshot();

  const data = useMemo(() => {
    if (!address || !snapshotQuery.data) return [];

    const alerts: UserAlert[] = [];
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

    userPools.forEach((pool) => {
      if (pool.state !== "Active" || Number(pool.cycleStartTime) <= 0) return;

      const currentCycleContributions = userContributions.filter(
        (contribution) =>
          contribution.poolId.toLowerCase() === pool.id.toLowerCase() &&
          contribution.cycleIndex === pool.currentCycle &&
          !contribution.isLiquidated,
      );

      if (currentCycleContributions.length > 0) return;

      const endTime = Number(pool.cycleStartTime) + Number(pool.periodDuration);
      const timeRemaining = endTime - Math.floor(Date.now() / 1000);
      const daysRemaining = timeRemaining / 86400;

      if (daysRemaining <= 0 || daysRemaining > 3) return;

      const amount = (Number(pool.contributionPerPeriod) / 1e6).toFixed(2);
      alerts.push({
        id: `reminder-${pool.id}-${pool.currentCycle}`,
        type: "reminder",
        title: "Contribution Due Soon",
        message: `Your contribution of $${amount} for "${pool.name}" is due ${formatDistanceToNow(new Date(endTime * 1000), { addSuffix: true })}`,
        poolId: pool.id,
      });
    });

    const recentPayouts = userCycles
      .filter((cycle) => cycle.winner.toLowerCase() === address.toLowerCase())
      .map((cycle) => {
        const cycleTimestamp = Number(cycle.createdAtTimestamp) * 1000;
        const daysSince = (Date.now() - cycleTimestamp) / (1000 * 60 * 60 * 24);
        if (daysSince > 7) return null;

        const pool = userPools.find(
          (userPool) => userPool.id.toLowerCase() === cycle.poolId.toLowerCase(),
        );
        if (!pool) return null;

        return {
          cycle,
          pool,
          amount: Number(cycle.prize) / 1e6,
        };
      })
      .filter((payout): payout is NonNullable<typeof payout> => payout !== null)
      .sort(
        (a, b) =>
          Number(b.cycle.createdAtTimestamp) - Number(a.cycle.createdAtTimestamp),
      );

    if (recentPayouts.length === 1) {
      const payout = recentPayouts[0];
      alerts.push({
        id: `payout-${payout.cycle.id}`,
        type: "success",
        title: "Payout Received",
        message: `You received $${payout.amount.toFixed(2)} from "${payout.pool.name}" cycle ${payout.cycle.index + 1}`,
        poolId: payout.pool.id,
      });
    } else if (recentPayouts.length > 1) {
      const totalReceived = recentPayouts.reduce(
        (sum, payout) => sum + payout.amount,
        0,
      );
      const latestPayout = recentPayouts[0];
      alerts.push({
        id: "payout-summary",
        type: "success",
        title: "Payouts Received",
        message: `You received $${totalReceived.toFixed(2)} across ${recentPayouts.length} payouts this week. Latest payout came from "${latestPayout.pool.name}".`,
      });
    }

    alerts.sort((a, b) => {
      if (a.type === "reminder" && b.type !== "reminder") return -1;
      if (a.type !== "reminder" && b.type === "reminder") return 1;
      return 0;
    });

    return alerts.slice(0, 4);
  }, [address, snapshotQuery.data]);

  return {
    ...snapshotQuery,
    data,
  };
}

