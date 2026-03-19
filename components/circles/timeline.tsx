"use client"

import { CheckCircle2, Clock } from "lucide-react"
import type { Pool, Cycle } from "@/lib/indexer"
import { format, formatDistanceToNow } from "date-fns"
import { useAccount } from "wagmi"
import { useEffect, useState } from "react"

interface CircleTimelineProps {
  circleId: string
  poolData?: {
    pool: Pool | null
    members: any[]
    cycles: Cycle[]
  }
}

export default function CircleTimeline({ circleId, poolData }: CircleTimelineProps) {
  const { address } = useAccount()
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Update current time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!poolData?.pool) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading timeline...</p>
      </div>
    )
  }

  const pool = poolData.pool
  const cycles = poolData.cycles || []

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

  // Helper untuk check if winner is current user
  const isCurrentUser = (winnerAddress: string) => {
    return address?.toLowerCase() === winnerAddress.toLowerCase()
  }

  // Helper untuk calculate draw time
  const getDrawTime = (cycleIndex: number) => {
    if (cycleIndex === pool.currentCycle && pool.state === "Active") {
      const startTime = Number(toBigInt(pool.cycleStartTime));
      const duration = Number(toBigInt(pool.periodDuration));
      return startTime + duration;
    }
    return null;
  };

  // Generate timeline events untuk semua cycles (completed + upcoming)
  const timelineEvents = Array.from({ length: pool.totalCycles }, (_, i) => {
    const cycleIndex = i
    const cycle = cycles.find((c) => c.index === cycleIndex)

    let status: "completed" | "current" | "upcoming"
    if (cycle && cycle.winner) {
      status = "completed"
    } else if (cycleIndex === pool.currentCycle && pool.state === "Active") {
      status = "current"
    } else {
      status = "upcoming"
    }

    const contribution = toBigInt(pool.contributionPerPeriod);
    const drawTime = getDrawTime(cycleIndex);
    
    return {
      index: cycleIndex,
      winner: cycle?.winner || null,
      prize: cycle?.prize ? toBigInt(cycle.prize) : contribution * BigInt(pool.maxMembers),
      yieldBonus: cycle?.yieldBonus ? toBigInt(cycle.yieldBonus) : 0n,
      createdAt: cycle?.createdAtTimestamp || null,
      drawTime, // Time when draw can be triggered
      status,
    }
  })

  if (timelineEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No cycles yet</p>
      </div>
    )
  }

  return (
    <div>
      {timelineEvents.map((event, idx) => {
        const eventDate = event.createdAt
          ? format(new Date(Number(toBigInt(event.createdAt)) * 1000), "MMM d, yyyy")
          : "TBD"
        
        // Calculate draw time remaining for current cycle with countdown
        const getDrawTimeInfo = () => {
          if (!event.drawTime || event.status !== "current") return { text: "", countdown: null };
          
          const drawTimeNum = Number(event.drawTime);
          if (currentTime >= drawTimeNum) {
            return { text: "Available now", countdown: null };
          }
          
          const remaining = drawTimeNum - currentTime;
          const days = Math.floor(remaining / 86400);
          const hours = Math.floor((remaining % 86400) / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          const seconds = remaining % 60;
          
          let countdownText = "";
          if (days > 0) countdownText += `${days}d `;
          if (hours > 0 || days > 0) countdownText += `${hours.toString().padStart(2, '0')}h `;
          countdownText += `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
          
          return {
            text: formatDistanceToNow(new Date(drawTimeNum * 1000), { addSuffix: true }),
            countdown: countdownText.trim()
          };
        };
        
        const drawTimeInfo = getDrawTimeInfo();

        return (
        <div
            key={event.index}
            className={`relative pl-8 pb-8 ${idx !== timelineEvents.length - 1 ? "border-l-2" : ""} ${
            event.status === "completed"
              ? "border-accent"
              : event.status === "current"
                ? "border-accent"
                : "border-border"
          }`}
        >
          {/* Timeline Dot */}
          <div
              className={`absolute ${idx !== timelineEvents.length - 1 ? "left-[-9px]" : "left-[-7px]"} top-0 w-4 h-4 rounded-full border-2 ${
              event.status === "completed"
                ? "bg-accent border-accent"
                : event.status === "current"
                  ? "border-accent bg-background"
                  : "border-border bg-background"
            }`}
          ></div>

          {/* Event Card */}
          <div
            className={`bg-card border rounded-lg p-4 ${
              event.status === "current" ? "border-accent/50 shadow-lg" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3 flex-1">
                  {event.status === "completed" && (
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                  )}
                {event.status === "current" && (
                  <Clock className="w-5 h-5 text-accent flex-shrink-0 mt-1 animate-pulse" />
                )}
                {event.status === "upcoming" && <div className="w-5 h-5 flex-shrink-0"></div>}

                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                      Cycle {event.index + 1}:{" "}
                      {event.winner ? (
                        <span className="text-accent font-mono text-sm">
                          {isCurrentUser(event.winner) ? "You" : formatAddress(event.winner)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {event.winner 
                        ? eventDate 
                        : event.drawTime 
                          ? (
                            drawTimeInfo.countdown 
                              ? (
                                <span>
                                  Draw in <span className="font-mono font-semibold text-accent">{drawTimeInfo.countdown}</span>
                                  <span className="text-xs ml-2">({drawTimeInfo.text})</span>
                                </span>
                              )
                              : drawTimeInfo.text
                          )
                          : "TBD"}
                    </p>
                    {toBigInt(event.yieldBonus) > 0n && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Yield bonus: ${formatUSDC(event.yieldBonus)}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-mono font-bold text-accent text-lg">
                  ${formatUSDC(event.prize)}
                </span>
            </div>

              {event.status === "current" && event.winner && isCurrentUser(event.winner) && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-accent font-semibold">YOUR PAYOUT</p>
              </div>
            )}
          </div>
        </div>
        )
      })}
    </div>
  )
}
