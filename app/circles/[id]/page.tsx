"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, TrendingUp, Calendar, Loader2 } from "lucide-react"
import CircleDetailTabs from "@/components/circles/detail-tabs"
import { useParams } from "next/navigation"
import { usePoolDetail } from "@/hooks/usePools"
import { formatDistanceToNow, format } from "date-fns"
import { JoinPoolButton } from "@/components/circles/join-pool-button"
import { ContributeButton } from "@/components/circles/contribute-button"
import { WithdrawButton } from "@/components/circles/withdraw-button"
// import { CycleCountdown } from "@/components/circles/cycle-countdown"
import { useEffect } from "react"
import { useWatchContractEvent } from "wagmi"
import { SancaPoolAbi } from "@/lib/abis"
import { toast } from "sonner"
import { CycleCountdown } from "@/components/circles/cycle-countdown"

export default function CircleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const poolId = id as string;

  // Fetch pool detail from the indexed API snapshot
  const { data, isLoading, error, refetch: refetchPoolDetail } = usePoolDetail(poolId);

  // Watch for WinnerSelected event untuk auto-refresh setelah winner selected
  useWatchContractEvent({
    address: poolId as `0x${string}` | undefined,
    abi: SancaPoolAbi,
    eventName: "WinnerSelected",
    onLogs: (logs) => {
      if (logs.length > 0 && logs[0].args) {
        const args = logs[0].args;
        const cycle = args.cycle;
        toast.success(`Winner selected for cycle ${cycle?.toString() ?? 'unknown'}! Refreshing data...`);
        // Give the API route a moment to ingest the latest chain state, then refetch
        setTimeout(() => {
          refetchPoolDetail();
        }, 5000);
      }
    },
  });

  // Watch for CycleEnded event untuk auto-refresh ketika cycle baru dimulai
  useWatchContractEvent({
    address: poolId as `0x${string}` | undefined,
    abi: SancaPoolAbi,
    eventName: "CycleEnded",
    onLogs: (logs) => {
      if (logs.length > 0 && logs[0].args) {
        const args = logs[0].args;
        const cycle = args.cycle;
        toast.info(`Cycle ${cycle?.toString() ?? 'unknown'} ended. Starting next cycle...`);
        // Give the API route a moment to ingest the latest chain state, then refetch
        setTimeout(() => {
          refetchPoolDetail();
        }, 5000);
      }
    },
  });

  // Watch for DrawTriggered event untuk auto-refresh setelah draw triggered
  useWatchContractEvent({
    address: poolId as `0x${string}` | undefined,
    abi: SancaPoolAbi,
    eventName: "DrawTriggered",
    onLogs: (logs) => {
      if (logs.length > 0 && logs[0].args) {
        const args = logs[0].args;
        const cycle = args.cycle;
        toast.info(`Draw triggered for cycle ${cycle?.toString() ?? 'unknown'}! Waiting for winner...`);
        // Give the API route a moment to ingest the latest chain state, then refetch
        setTimeout(() => {
          refetchPoolDetail();
        }, 3000);
      }
    },
  });

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

  // Helper untuk calculate progress
  // Progress = jumlah cycle yang sudah completed / total cycles
  // currentCycle adalah 0-indexed, jadi cycle yang sudah completed = currentCycle + 1
  // Tapi jika cycle saat ini belum completed, maka completed = currentCycle
  const getProgress = () => {
    if (!data?.pool || data.pool.totalCycles === 0) return 0;
    // Count completed cycles dari data.cycles
    const completedCycles = data.cycles?.filter((cycle: any) => cycle.winner !== null).length || 0;
    // Jika ada completed cycles, gunakan itu, jika tidak gunakan currentCycle sebagai fallback
    const cyclesCompleted = completedCycles > 0 ? completedCycles : data.pool.currentCycle;
    return Math.round((cyclesCompleted / data.pool.totalCycles) * 100);
  };

  // Helper untuk get completed cycles count
  const getCompletedCyclesCount = () => {
    if (!data?.pool) return 0;
    const completedCycles = data.cycles?.filter((cycle: any) => cycle.winner !== null).length || 0;
    return completedCycles > 0 ? completedCycles : data.pool.currentCycle;
  };

  // Helper untuk calculate total fund (contribution * maxMembers)
  const getTotalFund = () => {
    if (!data?.pool) return "0";
    const contribution = toBigInt(data.pool.contributionPerPeriod);
    const total = contribution * BigInt(data.pool.maxMembers);
    return formatUSDC(total);
  };

  // Helper untuk format period duration (always in days)
  const formatPeriodDuration = (seconds: bigint | string | number) => {
    const bigIntSeconds = toBigInt(seconds);
    const days = Math.round(Number(bigIntSeconds) / 86400);
    return `${days} ${days === 1 ? "day" : "days"}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading pool...</span>
      </div>
    );
  }

  if (error || !data?.pool) {
    return (
      <div className="space-y-8 min-h-screen">
        <Link href="/circles">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Circles
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">
            {error ? `Failed to load pool: ${error.message}` : "Pool not found"}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const pool = data.pool;
  const progress = getProgress();
  const totalFund = getTotalFund();
  const createdDate = new Date(Number(toBigInt(pool.createdAtTimestamp)) * 1000);
  const isFull = data.members.length >= pool.maxMembers;

  // useEffect(() => {
  //   console.log('pool condition', pool);
  // }, [pool]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="space-y-8 max-w-6xl mx-auto min-h-screen">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <Link href="/circles">
            <Button variant="ghost" size="sm" className="gap-1 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Circles
            </Button>
          </Link>
        </div>

        {/* Circle Info */}
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-2">{pool.name}</h1>
              <p className="text-lg text-muted-foreground mb-3">
                Created by {pool.creator.slice(0, 6)}...{pool.creator.slice(-4)}
              </p>
              {pool.description && (
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {pool.description}
                </p>
              )}
            </div>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mt-4 md:mt-0 w-fit ${pool.state === "Active"
                  ? "bg-accent/10 text-accent"
                  : pool.state === "Completed"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-muted text-muted-foreground"
                }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${pool.state === "Active"
                    ? "bg-accent"
                    : pool.state === "Completed"
                      ? "bg-green-500"
                      : "bg-muted-foreground"
                  }`}
              ></div>
              <span className="text-sm font-semibold">{pool.state}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Max Members</p>
              <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                {pool.maxMembers}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.members.length} joined
                {isFull && (
                  <span className="ml-1 font-semibold text-destructive">
                    (Pool is full)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Contribution</p>
              <p className="text-2xl font-bold text-foreground font-mono">
                ${formatUSDC(pool.contributionPerPeriod)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                per cycle ({formatPeriodDuration(pool.periodDuration)} per cycle)
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total Fund</p>
              <p className="text-2xl font-bold text-accent font-mono flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                ${totalFund}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Created</p>
              <p className="text-sm text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                {format(createdDate, "MMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(createdDate, { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Progress */}
          {pool.state === "Active" && (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Cycle Progress</h3>
                <span className="text-sm font-semibold text-foreground">{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-accent h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {getCompletedCyclesCount()} of {pool.totalCycles} cycles completed
              </p>
            </div>
          )}

          {/* Join Pool Button / Full Info */}
          {pool.state === "Open" && (
            <div className="mt-8 pt-6 border-t border-border">
              {isFull ? (
                <p className="text-sm text-muted-foreground text-center">
                  This pool has reached its maximum of {pool.maxMembers} members and can no longer accept new participants.
                </p>
              ) : (
                <JoinPoolButton
                  poolAddress={pool.id as `0x${string}`}
                  poolState={pool.state}
                  currentMembers={data.members.length}
                  maxMembers={pool.maxMembers}
                  members={data.members}
                />
              )}
            </div>
          )}

          {/* Contribute Button & Countdown */}
          {pool.state === "Active" && (
            <div className="mt-8 pt-6 border-t border-border space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-4">
                  Cycle {pool.currentCycle + 1} Contribution
                </h3>
                <ContributeButton
                  poolAddress={pool.id as `0x${string}`}
                  poolState={pool.state}
                  currentCycle={pool.currentCycle}
                  members={data.members}
                  cycleContributions={data.cycleContributions || []}
                />
              </div>

              {/* Cycle Countdown */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Cycle Period</h3>
                <CycleCountdown
                  cycleStartTime={toBigInt(pool.cycleStartTime)}
                  periodDuration={toBigInt(pool.periodDuration)}
                />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Settlement runs automatically after the cycle period ends
                </p>
              </div>
            </div>
          )}

          {/* Withdraw Button */}
          {pool.state === "Completed" && (
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="font-semibold text-foreground mb-4">Withdraw Funds</h3>
              <WithdrawButton
                poolAddress={pool.id as `0x${string}`}
                poolState={pool.state}
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <CircleDetailTabs circleId={pool.id} poolData={data} />
      </div>
    </div>
  );
}