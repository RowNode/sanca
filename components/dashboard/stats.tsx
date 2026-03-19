"use client"

import { TrendingUp, Users, Calendar, DollarSign, Loader2 } from "lucide-react"
import { useUserStats } from "@/hooks/useUserStats"
import { useUserPools } from "@/hooks/usePools"
import { formatDistanceToNow } from "date-fns"

export default function DashboardStats() {
  const { data: stats, isLoading: statsLoading } = useUserStats()
  const { data: userPools, isLoading: poolsLoading } = useUserPools()

  // Calculate next payout date
  const getNextPayout = () => {
    if (!userPools || userPools.length === 0) return null;

    const activePools = userPools.filter((p) => p.state === "Active");
    if (activePools.length === 0) return null;

    // Find the earliest cycle end time
    let earliestEndTime: number | null = null;
    activePools.forEach((pool) => {
      if (Number(pool.cycleStartTime) > 0 && Number(pool.periodDuration) > 0) {
        const endTime = Number(pool.cycleStartTime) + Number(pool.periodDuration);
        if (!earliestEndTime || endTime < earliestEndTime) {
          earliestEndTime = endTime;
        }
      }
    });

    return earliestEndTime ? new Date(earliestEndTime * 1000) : null;
  };

  const nextPayout = getNextPayout();

  if (statsLoading || poolsLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-6"
          >
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const statsData = [
    {
      label: "Active Circles",
      value: stats?.activePools.toString() || "0",
      change: `${stats?.totalPools || 0} total ${stats?.totalPools === 1 ? "circle" : "circles"}`,
      icon: Users,
      color: "text-accent",
    },
    {
      label: "Total Contributed",
      value: `$${stats?.totalContributed.toFixed(2) || "0.00"}`,
      change: `Across ${stats?.totalPools || 0} ${stats?.totalPools === 1 ? "circle" : "circles"}`,
      icon: DollarSign,
      color: "text-accent",
    },
    {
      label: "Total Received",
      value: `$${stats?.totalReceived.toFixed(2) || "0.00"}`,
      change: stats?.totalReceived && stats.totalReceived > 0 ? "From payouts" : "No payouts yet",
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      label: "Next Payout",
      value: nextPayout ? formatDistanceToNow(nextPayout, { addSuffix: false }).split(" ")[0] : "N/A",
      change: nextPayout ? formatDistanceToNow(nextPayout, { addSuffix: true }) : "No active pools",
      icon: Calendar,
      color: "text-accent",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-lg p-6 hover:border-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg bg-accent/10`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-foreground font-mono mb-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </div>
        )
      })}
    </div>
  )
}
