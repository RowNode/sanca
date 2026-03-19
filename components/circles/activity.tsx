"use client"

import { CheckCircle2, Users, TrendingUp, DollarSign, AlertTriangle, Play, CheckCircle, LogOut } from "lucide-react"
import type { Pool, Member, Cycle, CycleContribution } from "@/lib/indexer"
import { formatDistanceToNow, format } from "date-fns"

interface CircleActivityProps {
  circleId: string
  poolData?: {
    pool: Pool | null
    members: Member[]
    cycles: Cycle[]
    cycleContributions?: CycleContribution[]
  }
}

export default function CircleActivity({ circleId, poolData }: CircleActivityProps) {
  if (!poolData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    )
  }

  // Helper untuk convert string/number ke BigInt
  const toBigInt = (value: bigint | string | number): bigint => {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'string') return BigInt(value);
    return BigInt(value);
  };

  // Helper untuk format USDC amount (6 decimals)
  const formatUSDC = (amount: bigint | string | number) => {
    const bigIntAmount = toBigInt(amount);
    return (Number(bigIntAmount) / 1e6).toFixed(2);
  };

  // Helper untuk format address
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Combine activities dari semua events
  type ActivityType = {
    id: string
    type: string
  title: string
  description: string
  amount?: string
    date: Date
    icon: typeof CheckCircle2 | typeof Users | typeof TrendingUp | typeof DollarSign | typeof AlertTriangle | typeof Play | typeof CheckCircle | typeof LogOut
  color: string
}

  const activities: ActivityType[] = []

  const pool = poolData.pool;
  const members = poolData.members || [];
  const cycles = poolData.cycles || [];
  const cycleContributions = poolData.cycleContributions || [];

  // Add pool created event (from pool createdAtTimestamp)
  if (pool) {
    activities.push({
      id: `pool-created-${pool.id}`,
      type: "pool_created",
      title: "Pool Created",
      description: `Pool "${pool.name}" was created`,
      date: new Date(Number(toBigInt(pool.createdAtTimestamp)) * 1000),
      icon: CheckCircle,
      color: "text-accent",
    });

    // Add pool started event (if pool is Active or Completed)
    if (pool.state === "Active" || pool.state === "Completed") {
      const poolStartedTime = Number(toBigInt(pool.cycleStartTime));
      if (poolStartedTime > 0) {
        activities.push({
          id: `pool-started-${pool.id}`,
          type: "pool_started",
          title: "Pool Started",
          description: "Pool is now active and cycles have begun",
          date: new Date(poolStartedTime * 1000),
          icon: Play,
          color: "text-green-500",
        });
      }
    }

    // Add pool completed event (if pool is Completed)
    if (pool.state === "Completed") {
      // Use the last cycle's timestamp as pool completion time
      const lastCycle = cycles[cycles.length - 1];
      if (lastCycle) {
        activities.push({
          id: `pool-completed-${pool.id}`,
          type: "pool_completed",
          title: "Pool Completed",
          description: "All cycles have been completed",
          date: new Date(Number(toBigInt(lastCycle.createdAtTimestamp)) * 1000),
    icon: CheckCircle2,
          color: "text-green-500",
        });
      }
    }
  }

  // Add member joined events
  members.forEach((member) => {
    activities.push({
      id: `member-${member.id}`,
      type: "member_joined",
      title: "Member Joined",
      description: `${formatAddress(member.address)} joined the pool`,
      date: new Date(Number(toBigInt(member.joinedAtTimestamp)) * 1000),
      icon: Users,
      color: "text-accent",
    });
  });

  // Add contribution events
  cycleContributions.forEach((contrib) => {
    if (contrib.isLiquidated) {
      activities.push({
        id: `liquidated-${contrib.id}`,
        type: "collateral_liquidated",
        title: "Collateral Liquidated",
        description: `${formatAddress(contrib.memberAddress)}'s collateral was liquidated for cycle ${contrib.cycleIndex + 1}`,
        amount: `$${formatUSDC(contrib.amount)}`,
        date: new Date(Number(toBigInt(contrib.createdAtTimestamp)) * 1000),
        icon: AlertTriangle,
        color: "text-orange-500",
      });
    } else {
      activities.push({
        id: `contributed-${contrib.id}`,
        type: "contributed",
        title: "Contribution Made",
        description: `${formatAddress(contrib.memberAddress)} contributed to cycle ${contrib.cycleIndex + 1}`,
        amount: `$${formatUSDC(contrib.amount)}`,
        date: new Date(Number(toBigInt(contrib.createdAtTimestamp)) * 1000),
        icon: DollarSign,
    color: "text-accent",
      });
    }
  });

  // Add payout events (cycles dengan winner)
  cycles.forEach((cycle) => {
    if (cycle.winner) {
      activities.push({
        id: `cycle-${cycle.id}`,
    type: "payout",
    title: "Payout Completed",
        description: `${formatAddress(cycle.winner)} won cycle ${cycle.index + 1}`,
        amount: `$${formatUSDC(cycle.prize)}`,
        date: new Date(Number(toBigInt(cycle.createdAtTimestamp)) * 1000),
    icon: TrendingUp,
        color: "text-green-500",
      });
    }
  });

  // Sort by date (newest first)
  activities.sort((a, b) => b.date.getTime() - a.date.getTime())

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((event) => {
        const Icon = event.icon
        return (
          <div key={event.id} className="bg-card border border-border rounded-lg p-4 flex gap-4">
            <div className={`${event.color} mt-1 flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <p className="font-semibold text-foreground">{event.title}</p>
              <p className="text-sm text-muted-foreground">{event.description}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {formatDistanceToNow(event.date, { addSuffix: true })}
              </p>
            </div>

            {event.amount && (
              <p className="font-mono font-bold text-accent text-lg flex-shrink-0">{event.amount}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
