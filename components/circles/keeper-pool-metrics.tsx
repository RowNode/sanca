"use client";

import { ArrowUpRight, BrainCircuit, Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface KeeperPoolMetricsProps {
  apy30d?: number;
  poolState?: "Open" | "Active" | "Completed";
  nextAction?: "rebalance" | "collectFees" | "noop";
  volatilityRegime?: "low" | "medium" | "high" | "extreme";
  decisionSource?: "groq-agent" | "rules-fallback" | "unknown";
  tvlUsd?: number;
}

function formatPercent(value?: number): string {
  if (value === undefined || Number.isNaN(value)) return "--";
  return `${value.toFixed(2)}%`;
}

function actionLabel(action?: "rebalance" | "collectFees" | "noop"): string {
  if (action === "collectFees") return "Collect Fees";
  if (action === "rebalance") return "Rebalance";
  return "Monitoring";
}

function regimeLabel(regime?: "low" | "medium" | "high" | "extreme"): string {
  if (!regime) return "No signal";
  return `${regime.charAt(0).toUpperCase()}${regime.slice(1)} vol`;
}

function regimeClasses(regime?: "low" | "medium" | "high" | "extreme"): string {
  if (regime === "low") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (regime === "medium") return "border-sky-500/30 bg-sky-500/10 text-sky-400";
  if (regime === "high") return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  if (regime === "extreme") return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  return "border-border bg-muted text-muted-foreground";
}

export function KeeperPoolMetrics({
  apy30d,
  poolState,
  nextAction,
  volatilityRegime,
  decisionSource,
  tvlUsd,
}: KeeperPoolMetricsProps) {
  const hasKeeperData = apy30d !== undefined || tvlUsd !== undefined;

  if (!hasKeeperData) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3">
        <p className="text-xs font-medium text-muted-foreground">Keeper analytics unavailable</p>
        <p className="mt-1 text-xs text-muted-foreground/80">
          Start the keeper service to surface APY, signal, and next action.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Intelligent Keeper
          </p>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-lg font-semibold text-foreground">{formatPercent(apy30d)}</span>
            <span className="pb-0.5 text-xs text-muted-foreground">30D APY</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {typeof tvlUsd === "number" ? `Vault TVL $${tvlUsd.toFixed(2)}` : "Vault TVL --"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {poolState === "Completed" && (
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
          <Badge variant="outline" className={regimeClasses(volatilityRegime)}>
            <Waves className="h-3 w-3" />
            {regimeLabel(volatilityRegime)}
          </Badge>
          <Badge variant="outline" className="border-accent/30 bg-accent/10 text-accent">
            <ArrowUpRight className="h-3 w-3" />
            {actionLabel(nextAction)}
          </Badge>
          {decisionSource === "groq-agent" && (
            <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-400">
              <BrainCircuit className="h-3 w-3" />
              AI
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
