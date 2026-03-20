"use client";

import { useMemo } from "react";
import { BrainCircuit, ExternalLink, Loader2, Sparkles, Waves } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useKeeperDecisionHistory, useKeeperPoolSummaries } from "@/hooks/useKeeper";
import { usePools } from "@/hooks/usePools";

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getHashScanTxUrl(txHash: string): string {
  return `https://hashscan.io/testnet/tx/${txHash}`;
}

function actionVariant(action: string): "default" | "secondary" | "outline" {
  if (action === "rebalance") return "default";
  if (action === "collectFees") return "secondary";
  return "outline";
}

function statusClass(status: string): string {
  if (status === "executed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (status === "failed") return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  return "border-border bg-muted text-muted-foreground";
}

function regimeClass(regime?: string | null): string {
  if (regime === "low") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (regime === "medium") return "border-sky-500/30 bg-sky-500/10 text-sky-400";
  if (regime === "high") return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  if (regime === "extreme") return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  return "border-border bg-muted text-muted-foreground";
}

export default function KeeperPage() {
  const { data: poolSummaries, isLoading: summariesLoading, error: summariesError } =
    useKeeperPoolSummaries();
  const { data: historyEntries, isLoading: historyLoading, error: historyError } =
    useKeeperDecisionHistory();
  const { data: pools } = usePools();

  const poolNameMap = useMemo(() => {
    return new Map((pools ?? []).map((pool) => [pool.id.toLowerCase(), pool.name]));
  }, [pools]);

  const stats = useMemo(() => {
    const summaries = poolSummaries ?? [];
    const history = historyEntries ?? [];

    const totalVaultTvl = summaries.reduce((sum, pool) => sum + pool.vaultTvlUsd, 0);
    const avgApy30d =
      summaries.length > 0
        ? summaries.reduce((sum, pool) => sum + pool.apy30d, 0) / summaries.length
        : 0;
    const aiManagedPools = summaries.filter((pool) => pool.decisionSource === "groq-agent").length;
    const recentExecuted = history.filter((entry) => entry.status === "executed").length;

    return {
      totalVaultTvl,
      avgApy30d,
      aiManagedPools,
      recentExecuted,
    };
  }, [historyEntries, poolSummaries]);

  const isLoading = summariesLoading || historyLoading;
  const poolSummarySlides = useMemo(() => {
    const summaries = poolSummaries ?? [];
    const chunks = [];

    for (let index = 0; index < summaries.length; index += 3) {
      chunks.push(summaries.slice(index, index + 3));
    }

    return chunks;
  }, [poolSummaries]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="space-y-8 max-w-6xl mx-auto min-h-screen">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold text-foreground">Keeper Intelligence</h1>
          <p className="max-w-3xl text-muted-foreground">
            Live observability for Sanca&apos;s volatility-aware Bonzo-style keeper. This page
            surfaces vault yield signals, next actions, and decision/execution history to make the
            agent behavior legible during demos.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Vault TVL</CardDescription>
              <CardTitle className="text-2xl">{formatUsd(stats.totalVaultTvl)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average 30D APY</CardDescription>
              <CardTitle className="text-2xl">{formatPercent(stats.avgApy30d)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>AI-Managed Pools</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BrainCircuit className="h-5 w-5 text-violet-400" />
                {stats.aiManagedPools}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Executed Actions</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="h-5 w-5 text-accent" />
                {stats.recentExecuted}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pool Yield Overview</CardTitle>
            <CardDescription>
              Yield, volatility regime, and the keeper&apos;s next intended action for each pool.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summariesLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading keeper summaries...
              </div>
            ) : summariesError ? (
              <p className="text-sm text-destructive">{summariesError.message}</p>
            ) : !poolSummaries?.length ? (
              <p className="text-sm text-muted-foreground">No keeper pool summaries available yet.</p>
            ) : (
              <Carousel opts={{ align: "start", loop: poolSummarySlides.length > 1 }} className="w-full">
                <CarouselContent>
                  {poolSummarySlides.map((slide, slideIndex) => (
                    <CarouselItem key={`slide-${slideIndex}`}>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {slide.map((pool) => (
                          <div
                            key={pool.address}
                            className="rounded-xl border border-border bg-card/40 p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {poolNameMap.get(pool.address.toLowerCase()) || shortAddress(pool.address)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {shortAddress(pool.address)}
                                </p>
                              </div>
                              <div className="flex flex-wrap justify-end gap-2">
                                {pool.state === "Completed" && (
                                  <>
                                    <Badge
                                      variant="outline"
                                      className="border-slate-500/30 bg-slate-500/10 text-slate-400"
                                    >
                                      Completed
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="border-slate-500/30 bg-slate-500/10 text-slate-400"
                                    >
                                      Monitoring Off
                                    </Badge>
                                  </>
                                )}
                                <Badge variant="outline" className={regimeClass(pool.volatilityRegime)}>
                                  <Waves className="h-3 w-3" />
                                  {pool.volatilityRegime}
                                </Badge>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                  30D APY
                                </p>
                                <p className="mt-1 text-lg font-semibold text-foreground">
                                  {formatPercent(pool.apy30d)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                  Yield
                                </p>
                                <p className="mt-1 text-sm font-medium text-foreground">
                                  {formatUsd(pool.accumulatedYieldUsd)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                  Vault TVL
                                </p>
                                <p className="mt-1 text-sm font-medium text-foreground">
                                  {formatUsd(pool.vaultTvlUsd)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Badge variant={actionVariant(pool.nextAction)}>
                                {pool.state === "Completed" ? "monitoring_off" : pool.nextAction}
                              </Badge>
                              <Badge variant="outline">{pool.decisionSource}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {poolSummarySlides.length > 1 && (
                  <>
                    <CarouselPrevious className="-left-4" />
                    <CarouselNext className="-right-4" />
                  </>
                )}
              </Carousel>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decision & Execution History</CardTitle>
            <CardDescription>
              Recent keeper reasoning, status, and transaction outcomes across all pools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading decision history...
              </div>
            ) : historyError ? (
              <p className="text-sm text-destructive">{historyError.message}</p>
            ) : !historyEntries?.length ? (
              <p className="text-sm text-muted-foreground">
                No keeper decisions have been recorded yet. Run the keeper to populate history.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Pool</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Reasoning</TableHead>
                    <TableHead>Tx</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {poolNameMap.get(entry.pool.toLowerCase()) || shortAddress(entry.pool)}
                          </span>
                          <span className="text-xs text-muted-foreground">{shortAddress(entry.pool)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className={statusClass(entry.status)}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-2">
                          <Badge variant="outline" className={regimeClass(entry.regime)}>
                            {entry.regime || "n/a"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{entry.decisionSource}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-sm whitespace-normal align-top">
                        <div className="space-y-1">
                          {entry.reasoning.map((line, index) => (
                            <p key={`${entry.id}-${index}`} className="text-xs text-muted-foreground">
                              {line}
                            </p>
                          ))}
                          {entry.error && <p className="text-xs text-destructive">{entry.error}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {entry.txHash ? (
                          <a
                            href={getHashScanTxUrl(entry.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs text-foreground underline-offset-4 hover:underline"
                          >
                            {shortAddress(entry.txHash)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">No tx</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
