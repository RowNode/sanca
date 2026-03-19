"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, CheckCircle2, Clock, Loader2 } from "lucide-react"
import { useUserPools } from "@/hooks/usePools"
import { formatDistanceToNow } from "date-fns"
import { KeeperPoolMetrics } from "@/components/circles/keeper-pool-metrics"

export default function ActiveCirclesSection() {
  const { data: userPools, isLoading } = useUserPools()

  // Helper untuk format USDC amount (6 decimals)
  const formatUSDC = (amount: bigint) => {
    return (Number(amount) / 1e6).toFixed(2)
  }

  // Helper untuk calculate progress
  const getProgress = (pool: any) => {
    if (!pool || pool.totalCycles === 0) return 0
    return Math.round((pool.currentCycle / pool.totalCycles) * 100)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Active Circles</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!userPools || userPools.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Active Circles</h2>
          <Link href="/circles">
            <Button variant="outline" size="sm" className="gap-1 bg-transparent">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">You haven't joined any circles yet</p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Active Circles</h2>
        <Link href="/circles">
          <Button variant="outline" size="sm" className="gap-1 bg-transparent">
            View All
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {userPools.map((pool) => {
          const progress = getProgress(pool)
          const joinedDate = new Date(Number(pool.userJoinedAt) * 1000)

          return (
            <Link key={pool.id} href={`/circles/${pool.id}`}>
            <div className="bg-card border border-border rounded-lg p-6 hover:border-accent/50 hover:bg-card/80 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg mb-1">{pool.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                        {pool.maxMembers} max members
                      </span>
                      <span className="font-mono text-foreground">
                        ${formatUSDC(pool.contributionPerPeriod)}/period
                    </span>
                    </div>
                  </div>
                <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        pool.state === "Active"
                          ? "bg-accent/10 text-accent"
                          : pool.state === "Completed"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          pool.state === "Active"
                            ? "bg-accent"
                            : pool.state === "Completed"
                              ? "bg-green-500"
                              : "bg-muted-foreground"
                        }`}
                      ></div>
                      {pool.state}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
                {pool.state === "Active" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Cycle Progress</span>
                      <span className="text-xs font-semibold text-foreground">{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
                )}

              <div className="mb-4">
                <KeeperPoolMetrics
                  apy30d={pool.keeperApy30d}
                  nextAction={pool.keeperNextAction}
                  volatilityRegime={pool.keeperVolatilityRegime}
                  decisionSource={pool.keeperDecisionSource}
                  tvlUsd={pool.keeperVaultTvlUsd}
                />
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Your Contribution</p>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      ${formatUSDC(pool.userContribution)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDistanceToNow(joinedDate, { addSuffix: true })}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold text-accent">Member</span>
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className="text-xs text-muted-foreground mb-2">Actions</p>
                  <Button variant="outline" size="sm" className="w-full bg-transparent text-xs">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </Link>
          )
        })}
      </div>
    </div>
  )
}
