"use client";

import { useAccount } from "wagmi";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

import { useIndexerSnapshot } from "@/hooks/useIndexerSnapshot";

export interface UserTransaction {
  id: string;
  type: "send" | "receive";
  circle: string;
  amount: string;
  date: string;
  timestamp: Date;
  status: "completed" | "pending" | "failed";
  description: string;
}

/**
 * Hook untuk get user transactions dari semua pools
 */
export function useUserTransactions() {
  const { address } = useAccount();
  const snapshotQuery = useIndexerSnapshot();

  const data = useMemo(() => {
    if (!address || !snapshotQuery.data) return [];

    const userMembers = snapshotQuery.data.members.filter(
      (member) => member.address.toLowerCase() === address.toLowerCase(),
    );
    const userPoolIds = new Set(userMembers.map((member) => member.poolId.toLowerCase()));
    const poolsMap = new Map(
      snapshotQuery.data.pools
        .filter((pool) => userPoolIds.has(pool.id.toLowerCase()))
        .map((pool) => [pool.id.toLowerCase(), pool]),
    );
    const userContributions = snapshotQuery.data.cycleContributions.filter(
      (contribution) =>
        contribution.memberAddress.toLowerCase() === address.toLowerCase(),
    );
    const userWins = snapshotQuery.data.cycles.filter(
      (cycle) => cycle.winner.toLowerCase() === address.toLowerCase(),
    );

    const transactions: UserTransaction[] = [];

    userMembers.forEach((member) => {
      const pool = poolsMap.get(member.poolId.toLowerCase());
      if (!pool) return;

      const amount = (Number(member.contribution) / 1e6).toFixed(2);
      transactions.push({
        id: `join-${member.id}`,
        type: "send",
        circle: pool.name,
        amount: `$${amount}`,
        date: formatDistanceToNow(new Date(Number(member.joinedAtTimestamp) * 1000), {
          addSuffix: true,
        }),
        timestamp: new Date(Number(member.joinedAtTimestamp) * 1000),
        status: "completed",
        description: `Joined "${pool.name}"`,
      });
    });

    userContributions.forEach((contribution) => {
      if (contribution.isLiquidated) return;

      const pool = poolsMap.get(contribution.poolId.toLowerCase());
      if (!pool) return;

      const amount = (Number(contribution.amount) / 1e6).toFixed(2);
      transactions.push({
        id: `contribute-${contribution.id}`,
        type: "send",
        circle: pool.name,
        amount: `$${amount}`,
        date: formatDistanceToNow(
          new Date(Number(contribution.createdAtTimestamp) * 1000),
          {
            addSuffix: true,
          },
        ),
        timestamp: new Date(Number(contribution.createdAtTimestamp) * 1000),
        status: "completed",
        description: `Contributed to cycle ${contribution.cycleIndex + 1} in "${pool.name}"`,
      });
    });

    userWins.forEach((cycle) => {
      const pool = poolsMap.get(cycle.poolId.toLowerCase());
      if (!pool) return;

      const amount = (Number(cycle.prize) / 1e6).toFixed(2);
      transactions.push({
        id: `payout-${cycle.id}`,
        type: "receive",
        circle: pool.name,
        amount: `$${amount}`,
        date: formatDistanceToNow(new Date(Number(cycle.createdAtTimestamp) * 1000), {
          addSuffix: true,
        }),
        timestamp: new Date(Number(cycle.createdAtTimestamp) * 1000),
        status: "completed",
        description: `Won cycle ${cycle.index + 1} in "${pool.name}"`,
      });
    });

    transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return transactions;
  }, [address, snapshotQuery.data]);

  return {
    ...snapshotQuery,
    data,
  };
}

