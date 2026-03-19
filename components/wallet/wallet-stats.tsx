"use client"

import { TrendingDown, TrendingUp, Calendar } from "lucide-react"
import { useUserStats } from "@/hooks/useUserStats"
import { Loader2 } from "lucide-react"

export default function WalletStats() {
  const { data: stats, isLoading } = useUserStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6">
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
      label: "Total Contributed",
      value: `$${stats?.totalContributed.toFixed(2) || "0.00"}`,
      change: `Across ${stats?.totalPools || 0} ${stats?.totalPools === 1 ? "circle" : "circles"}`,
      icon: TrendingDown,
      color: "text-foreground",
    },
    {
      label: "Total Received",
      value: `$${stats?.totalReceived.toFixed(2) || "0.00"}`,
      change: stats?.totalReceived && stats.totalReceived > 0 ? "From payouts" : "No payouts yet",
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      label: "Pending Payouts",
      value: `$${stats?.pendingPayouts.toFixed(2) || "0.00"}`,
      change: `Across ${stats?.activePools || 0} ${stats?.activePools === 1 ? "circle" : "circles"}`,
      icon: Calendar,
      color: "text-accent",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statsData.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg ${stat.color === "text-accent" ? "bg-accent/10" : "bg-primary/10"}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-foreground font-mono mb-2">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </div>
        )
      })}
    </div>
  )
}
