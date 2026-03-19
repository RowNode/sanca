"use client"

import { Calendar, Loader2 } from "lucide-react"
import { useUserPools } from "@/hooks/usePools"
import { useAccount } from "wagmi"
import { format } from "date-fns"
import Link from "next/link"

import { useIndexerSnapshot } from "@/hooks/useIndexerSnapshot"

export default function UpcomingPayouts() {
  const { address } = useAccount()
  const { data: userPools, isLoading: poolsLoading } = useUserPools()
  const { data: snapshot, isLoading: snapshotLoading } = useIndexerSnapshot()
  const cyclesData =
    snapshot && userPools
      ? snapshot.cycles.filter((cycle) =>
          userPools.some((pool) => pool.id.toLowerCase() === cycle.poolId.toLowerCase()),
        )
      : []

  if (poolsLoading || snapshotLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent" />
          Your Payouts
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Calculate upcoming payouts (active pools where user hasn't won yet)
  const upcomingPayouts: Array<{
    id: string
    circleId: string
    circleName: string
    amount: string
    date: string
    daysAway: number
  }> = []

  if (userPools && cyclesData) {
    const activePools = userPools.filter((p) => p.state === "Active");
    
    activePools.forEach((pool) => {
      const poolCycles = cyclesData.filter(
        (c) => c.poolId.toLowerCase() === pool.id.toLowerCase()
      );
      const userWon = poolCycles.some(
        (c) => c.winner.toLowerCase() === address?.toLowerCase()
      );

      if (!userWon && Number(pool.cycleStartTime) > 0 && Number(pool.periodDuration) > 0) {
        const endTime = Number(pool.cycleStartTime) + Number(pool.periodDuration);
        const endDate = new Date(endTime * 1000);
        const now = new Date();
        const daysAway = Math.ceil((endTime * 1000 - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysAway > 0) {
          const potentialPayout = (Number(pool.contributionPerPeriod) / 1e6) * pool.maxMembers;
          upcomingPayouts.push({
            id: `payout-${pool.id}`,
            circleId: pool.id,
            circleName: pool.name,
            amount: `$${potentialPayout.toFixed(2)}`,
            date: format(endDate, "MMM d, yyyy"),
            daysAway,
          });
        }
      }
    });

    // Sort by days away (soonest first)
    upcomingPayouts.sort((a, b) => a.daysAway - b.daysAway);
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-accent" />
        Your Payouts
      </h3>

      {upcomingPayouts.length > 0 ? (
        <div className="space-y-4">
          {upcomingPayouts.slice(0, 3).map((payout) => (
            <Link key={payout.id} href={`/circles/${payout.circleId}`}>
              <div className="pb-4 border-b border-border last:border-0 last:pb-0 hover:opacity-80 transition-opacity cursor-pointer">
                <p className="text-sm font-semibold text-foreground mb-1">{payout.circleName}</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-lg font-bold text-accent font-mono">{payout.amount}</span>
                  <span className="text-xs text-muted-foreground">
                    {payout.daysAway} {payout.daysAway === 1 ? "day" : "days"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{payout.date}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No payouts scheduled yet. Join or create a circle to get started.
        </div>
      )}
    </div>
  )
}
