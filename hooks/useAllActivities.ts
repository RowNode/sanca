"use client";

import { useAccount } from "wagmi";
import { useMemo } from "react";

import { useIndexerSnapshot } from "@/hooks/useIndexerSnapshot";

/**
 * Hook untuk get semua activities dari pools yang user ikuti
 */
export function useAllActivities() {
  const { address } = useAccount();
  const snapshotQuery = useIndexerSnapshot();

  const data = useMemo(() => {
    if (!address || !snapshotQuery.data) return [];

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
    const userContributions = snapshotQuery.data.cycleContributions.filter((contribution) =>
      userPoolIds.has(contribution.poolId.toLowerCase()),
    );
    const poolsMap = new Map(userPools.map((pool) => [pool.id.toLowerCase(), pool]));

    const activities: Array<{
      id: string;
      type:
        | "contribution"
        | "payout"
        | "member_joined"
        | "cycle_completed"
        | "pool_created"
        | "pool_started"
        | "pool_completed"
        | "collateral_liquidated";
      title: string;
      description: string;
      circle: string;
      member?: string;
      amount?: string;
      date: string;
      timestamp: Date;
    }> = [];

    userPools.forEach((pool) => {
      activities.push({
        id: `pool-created-${pool.id}`,
        type: "pool_created",
        title: "Pool Created",
        description: `Pool "${pool.name}" was created`,
        circle: pool.name,
        timestamp: new Date(Number(pool.createdAtTimestamp) * 1000),
        date: new Date(Number(pool.createdAtTimestamp) * 1000).toLocaleDateString(),
      });
    });

    userPools.forEach((pool) => {
      if (
        (pool.state === "Active" || pool.state === "Completed") &&
        Number(pool.cycleStartTime) > 0
      ) {
        activities.push({
          id: `pool-started-${pool.id}`,
          type: "pool_started",
          title: "Pool Started",
          description: `Pool "${pool.name}" is now active`,
          circle: pool.name,
          timestamp: new Date(Number(pool.cycleStartTime) * 1000),
          date: new Date(Number(pool.cycleStartTime) * 1000).toLocaleDateString(),
        });
      }
    });

    userMembers.forEach((member) => {
      const pool = poolsMap.get(member.poolId.toLowerCase());
      if (!pool) return;

      const isUser = member.address.toLowerCase() === address.toLowerCase();
      activities.push({
        id: `member-${member.id}`,
        type: "member_joined",
        title: isUser ? "You Joined" : "New Member Joined",
        description: isUser
          ? `You joined "${pool.name}"`
          : `New member joined "${pool.name}"`,
        circle: pool.name,
        timestamp: new Date(Number(member.joinedAtTimestamp) * 1000),
        date: new Date(Number(member.joinedAtTimestamp) * 1000).toLocaleDateString(),
      });
    });

    userContributions.forEach((contribution) => {
      const pool = poolsMap.get(contribution.poolId.toLowerCase());
      if (!pool) return;

      const isUser = contribution.memberAddress.toLowerCase() === address.toLowerCase();
      const amount = (Number(contribution.amount) / 1e6).toFixed(2);

      if (contribution.isLiquidated) {
        activities.push({
          id: `liquidated-${contribution.id}`,
          type: "collateral_liquidated",
          title: "Collateral Liquidated",
          description: isUser
            ? `Your collateral was liquidated for cycle ${contribution.cycleIndex + 1} in "${pool.name}"`
            : `Member's collateral was liquidated for cycle ${contribution.cycleIndex + 1} in "${pool.name}"`,
          circle: pool.name,
          amount: `$${amount}`,
          timestamp: new Date(Number(contribution.createdAtTimestamp) * 1000),
          date: new Date(Number(contribution.createdAtTimestamp) * 1000).toLocaleDateString(),
        });
        return;
      }

      activities.push({
        id: `contributed-${contribution.id}`,
        type: "contribution",
        title: isUser ? "Your Contribution" : "Contribution Received",
        description: isUser
          ? `You contributed $${amount} to cycle ${contribution.cycleIndex + 1} in "${pool.name}"`
          : `Contribution of $${amount} received for cycle ${contribution.cycleIndex + 1} in "${pool.name}"`,
        circle: pool.name,
        amount: `$${amount}`,
        timestamp: new Date(Number(contribution.createdAtTimestamp) * 1000),
        date: new Date(Number(contribution.createdAtTimestamp) * 1000).toLocaleDateString(),
      });
    });

    userCycles.forEach((cycle) => {
      const pool = poolsMap.get(cycle.poolId.toLowerCase());
      if (!pool || !cycle.winner) return;

      const isUser = cycle.winner.toLowerCase() === address.toLowerCase();
      const amount = (Number(cycle.prize) / 1e6).toFixed(2);

      activities.push({
        id: `cycle-${cycle.id}`,
        type: "payout",
        title: isUser ? "You Won!" : "Payout Completed",
        description: isUser
          ? `You won cycle ${cycle.index + 1} in "${pool.name}"`
          : `Winner received payout for cycle ${cycle.index + 1} in "${pool.name}"`,
        circle: pool.name,
        amount: `$${amount}`,
        timestamp: new Date(Number(cycle.createdAtTimestamp) * 1000),
        date: new Date(Number(cycle.createdAtTimestamp) * 1000).toLocaleDateString(),
      });
    });

    userPools.forEach((pool) => {
      if (pool.state !== "Completed") return;

      const lastCycle = userCycles
        .filter((cycle) => cycle.poolId.toLowerCase() === pool.id.toLowerCase())
        .sort((a, b) => b.index - a.index)[0];

      if (!lastCycle) return;

      activities.push({
        id: `pool-completed-${pool.id}`,
        type: "pool_completed",
        title: "Pool Completed",
        description: `All cycles completed for "${pool.name}"`,
        circle: pool.name,
        timestamp: new Date(Number(lastCycle.createdAtTimestamp) * 1000),
        date: new Date(Number(lastCycle.createdAtTimestamp) * 1000).toLocaleDateString(),
      });
    });

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activities;
  }, [address, snapshotQuery.data]);

  return {
    ...snapshotQuery,
    data,
  };
}

