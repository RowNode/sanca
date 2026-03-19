const DEFAULT_KEEPER_SERVICE_URL = "http://127.0.0.1:3002";

export interface KeeperPoolSummary {
  address: `0x${string}`;
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

export interface KeeperPoolSummariesResponse {
  pools: KeeperPoolSummary[];
  count: number;
}

export interface KeeperDecisionHistoryEntry {
  id: string;
  timestamp: string;
  pool: `0x${string}`;
  action: "rebalance" | "collectFees" | "noop" | "unknown";
  status: "executed" | "failed" | "skipped";
  txHash: `0x${string}` | null;
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

export interface KeeperDecisionHistoryResponse {
  items: KeeperDecisionHistoryEntry[];
  count: number;
}

function getKeeperServiceBaseUrl(): string {
  return process.env.KEEPER_SERVICE_URL || DEFAULT_KEEPER_SERVICE_URL;
}

async function fetchKeeperService<T>(path: string): Promise<T> {
  const response = await fetch(`${getKeeperServiceBaseUrl()}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Keeper service request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getKeeperPoolSummaries(): Promise<KeeperPoolSummariesResponse> {
  return fetchKeeperService<KeeperPoolSummariesResponse>("/pools");
}

export async function getKeeperDecisionHistory(pool?: string): Promise<KeeperDecisionHistoryResponse> {
  const search = pool ? `?pool=${encodeURIComponent(pool)}` : "";
  return fetchKeeperService<KeeperDecisionHistoryResponse>(`/api/keeper/decisions${search}`);
}
