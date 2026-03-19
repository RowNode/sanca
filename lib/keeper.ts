export interface KeeperPoolSummary {
  address: string;
  state: "Open" | "Active" | "Completed";
  currentCycle: string;
  totalDeposited: string;
  vaultTvlUsd: number;
  apy7d: number;
  apy30d: number;
  accumulatedYieldUsd: number;
  recentFeesCollectedUsd: number;
  volatilityRegime: "low" | "medium" | "high" | "extreme";
  nextAction: "rebalance" | "collectFees" | "noop";
  decisionSource: "groq-agent" | "rules-fallback" | "unknown";
}

export interface KeeperDecisionHistoryEntry {
  id: string;
  timestamp: string;
  pool: string;
  action: "rebalance" | "collectFees" | "noop" | "unknown";
  status: "executed" | "failed" | "skipped";
  txHash: string | null;
  executionProvider: "viem" | null;
  reasoning: string[];
  params: {
    baseLower: number;
    baseUpper: number;
    limitLower: number;
    limitUpper: number;
    swapQuantity: string;
  } | null;
  regime: "low" | "medium" | "high" | "extreme" | null;
  decisionSource: "groq-agent" | "rules-fallback" | "unknown";
  error?: string;
}

interface KeeperPoolSummariesResponse {
  pools: KeeperPoolSummary[];
  count: number;
}

interface KeeperDecisionHistoryResponse {
  items: KeeperDecisionHistoryEntry[];
  count: number;
}

async function fetchApi<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchKeeperPoolSummaries(): Promise<KeeperPoolSummary[]> {
  const response = await fetchApi<KeeperPoolSummariesResponse>("/api/keeper/pools");
  return response.pools;
}

export async function fetchKeeperDecisionHistory(pool?: string): Promise<KeeperDecisionHistoryEntry[]> {
  const search = pool ? `?pool=${encodeURIComponent(pool)}` : "";
  const response = await fetchApi<KeeperDecisionHistoryResponse>(`/api/keeper/decisions${search}`);
  return response.items;
}
