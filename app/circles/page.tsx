"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CreateCircleDialog } from "@/components/circles/create-circle-dialog"
import { KeeperPoolMetrics } from "@/components/circles/keeper-pool-metrics"
import { usePools } from "@/hooks/usePools"
import type { Pool } from "@/lib/indexer"
import { useAccount } from "wagmi"
import { formatDistanceToNow } from "date-fns"

type FilterStatus = "all" | "Open" | "Active" | "Completed"

export default function CirclesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { address } = useAccount()

  // Fetch pools from the indexed API snapshot
  const { data: pools, isLoading, error } = usePools({
    state: filterStatus === "all" ? undefined : filterStatus,
  })

  // Filter pools berdasarkan search query
  const filteredCircles = useMemo(() => {
    if (!pools) return []

    return pools.filter((pool) => {
      const matchesSearch = pool.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [pools, searchQuery])

  // Helper untuk format USDC amount (6 decimals)
  const formatUSDC = (amount: bigint) => {
    return (Number(amount) / 1e6).toFixed(2)
  }

  // Helper untuk calculate progress
  const getProgress = (pool: Pool) => {
    if (pool.totalCycles === 0) return 0
    return Math.round((pool.currentCycle / pool.totalCycles) * 100)
  }

  // Helper untuk check user status in pool
  const getUserStatus = (pool: Pool) => {
    // TODO: Check if user is member via members query
    // For now, just check if creator
    if (address && pool.creator.toLowerCase() === address.toLowerCase()) {
      return "creator"
    }
    return "member" // Placeholder
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">


      <div className="space-y-8 max-w-6xl mx-auto min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Circles</h1>
            <p className="text-muted-foreground mt-2">Manage and explore your saving circles</p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-5 h-5" />
            Create Circle
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search circles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "Open", "Active", "Completed"] as FilterStatus[]).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status as any)}
                className={filterStatus !== status ? "bg-transparent" : ""}
              >
                {status === "all" ? "All" : status}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading circles...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">Failed to load circles: {error.message}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        )}

        {/* Circles Grid */}
        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCircles.map((pool) => {
                const progress = getProgress(pool)
                const userStatus = getUserStatus(pool)
                const createdDate = new Date(Number(pool.createdAtTimestamp) * 1000)

                return (
                  <Link key={pool.id} href={`/circles/${pool.id}`}>
                    <div className="bg-card border border-border rounded-lg p-6 hover:border-accent/50 hover:shadow-lg transition-all h-full cursor-pointer flex flex-col">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-foreground text-lg">{pool.name}</h3>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${pool.state === "Active"
                                ? "bg-accent/10 text-accent"
                                : pool.state === "Completed"
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-muted text-muted-foreground"
                              }`}
                          >
                            {pool.state}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{pool.maxMembers}</span> max members
                            {pool.state !== "Open" && (
                              <span className="ml-1 text-xs font-semibold text-destructive">
                                (Full)
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-mono font-semibold text-foreground">
                              ${formatUSDC(pool.contributionPerPeriod)}
                            </span>
                            /period
                          </p>
                        </div>

                        {/* Progress Bar */}
                        {pool.state === "Active" && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">Progress</span>
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
                            poolState={pool.state}
                            nextAction={pool.keeperNextAction}
                            volatilityRegime={pool.keeperVolatilityRegime}
                            decisionSource={pool.keeperDecisionSource}
                            tvlUsd={pool.keeperVaultTvlUsd}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-border pt-4 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(createdDate, { addSuffix: true })}
                        </span>
                        {address && (
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded ${userStatus === "creator"
                                ? "bg-primary/10 text-primary"
                                : "bg-accent/10 text-accent"
                              }`}
                          >
                            {userStatus === "creator" ? "Creator" : "Member"}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {filteredCircles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No circles found matching your search</p>
                <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create Your First Circle
                </Button>
              </div>
            )}
          </>
        )}

        <CreateCircleDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      </div>
    </div>
  )
}
