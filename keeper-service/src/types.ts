export type HexAddress = `0x${string}`;

export type VolatilityRegime = "low" | "medium" | "high" | "extreme";
export type KeeperAction = "rebalance" | "collectFees" | "noop";
export type DecisionSource = "groq-agent" | "rules-fallback" | "unknown";
export type DecisionStatus = "executed" | "failed" | "skipped";
export type PoolState = "Open" | "Active" | "Completed";

export interface RegimeProfile {
  baseHalfWidth: number;
  limitHalfWidth: number;
}

export interface RebalanceParams {
  baseLower: number;
  baseUpper: number;
  limitLower: number;
  limitUpper: number;
  swapQuantity: string;
}

export interface KeeperDecision {
  action: KeeperAction;
  reasoning: string[];
  params: RebalanceParams | null;
  source: DecisionSource;
}

export interface Thresholds {
  low: number;
  medium: number;
  high: number;
}

export interface TokenMetadata {
  address: HexAddress;
  symbol: string;
  decimals: number;
}

export interface MarketSignal {
  pair: string;
  source: string;
  spotPrice: number;
  realizedVolatility1h: number;
  realizedVolatility24h: number;
  realizedVolatility7d: number;
  volatilityRegime: VolatilityRegime;
  thresholds: Thresholds;
  poolAddress?: HexAddress;
  token0?: TokenMetadata;
  token1?: TokenMetadata;
  twapPrice1h?: number;
  twapPrice6h?: number;
  twapPrice24h?: number;
  twapPrice7d?: number;
  currentTick?: number;
  avgTick1h?: number;
  avgTick6h?: number;
  avgTick24h?: number;
  avgTick7d?: number;
}

export interface PoolContextData {
  address: HexAddress;
  name: string;
  description: string;
  keeper: HexAddress;
  state: PoolState;
  stateCode: number;
  maxMembers: number;
  currentMembers: number;
  contributionPerPeriod: bigint;
  periodDuration: bigint;
  yieldBonusSplit: number;
  currentCycle: bigint;
  totalCycles: bigint;
  cycleStartTime: bigint;
  totalDeposited: bigint;
}

export interface VaultContextData {
  address: HexAddress;
  vaultShares: bigint;
  totalAssets: bigint;
  vaultTvlUsd: number;
  currentTick: number;
  baseLower: number;
  baseUpper: number;
  limitLower: number;
  limitUpper: number;
  pendingFeeAssets: bigint;
  rebalanceCount: bigint;
  lastRebalanceAt: bigint;
}

export interface PerformanceMetrics {
  vaultTvlUsd: number;
  principalUsd: number;
  accumulatedYieldUsd: number;
  recentFeesCollectedUsd: number;
  apy7d: number;
  apy30d: number;
  rebalanceCount: number;
}

export interface KeeperContext {
  pool: PoolContextData;
  vault: VaultContextData;
  performance: PerformanceMetrics;
  market: MarketSignal;
}

export interface DecisionHistoryEntryInput {
  pool: HexAddress;
  action: KeeperAction | "unknown";
  status: DecisionStatus;
  txHash: HexAddress | null;
  executionProvider: "viem" | null;
  reasoning: string[];
  params: RebalanceParams | null;
  regime: VolatilityRegime | null;
  decisionSource: DecisionSource;
  error?: string;
}

export interface DecisionHistoryEntry extends DecisionHistoryEntryInput {
  id: string;
  timestamp: string;
}

export interface ExecuteKeeperActionInput {
  poolAddress: HexAddress;
  decision: Exclude<KeeperAction, "noop">;
  params: RebalanceParams | null;
}

export interface ExecuteKeeperActionResult {
  txHash: HexAddress;
  executionProvider: "viem";
}

export interface KeeperRunSummary {
  poolsChecked: number;
  rebalanced: number;
  feesCollected: number;
  noops: number;
}
