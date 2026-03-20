import type { HexAddress, RegimeProfile, Thresholds } from "./types.js";

const DEFAULT_RPC_URL = "https://testnet.hashio.io/api";
const DEFAULT_MAINNET_RPC_URL = "https://mainnet.hashio.io/api";

const DEFAULT_FACTORY_ADDRESS = "0x08a74CB8D0B398d9d6add0992085E488321Ef686" as HexAddress;
const DEFAULT_SAUCERSWAP_POOL_ADDRESS =
  "0xc5b707348da504e9be1bd4e21525459830e7b11d" as HexAddress;

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFloatValue = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseStrategyMode = (value: string | undefined): "normal" | "demo" => {
  return value === "demo" ? "demo" : "normal";
};

export const HEDERA_TESTNET = {
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { decimals: 18, name: "HBAR", symbol: "HBAR" },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL || DEFAULT_RPC_URL],
    },
  },
} as const;

export const HEDERA_MAINNET = {
  id: 295,
  name: "Hedera Mainnet",
  nativeCurrency: { decimals: 18, name: "HBAR", symbol: "HBAR" },
  rpcUrls: {
    default: {
      http: [process.env.MAINNET_RPC_URL || DEFAULT_MAINNET_RPC_URL],
    },
  },
} as const;

const volatilityThresholds: Thresholds = {
  low: parseFloatValue(process.env.VOL_LOW_THRESHOLD, 0.12),
  medium: parseFloatValue(process.env.VOL_MEDIUM_THRESHOLD, 0.24),
  high: parseFloatValue(process.env.VOL_HIGH_THRESHOLD, 0.38),
};

const regimeProfiles: Record<"low" | "medium" | "high" | "extreme", RegimeProfile> = {
  low: { baseHalfWidth: 60, limitHalfWidth: 180 },
  medium: { baseHalfWidth: 120, limitHalfWidth: 360 },
  high: { baseHalfWidth: 180, limitHalfWidth: 540 },
  extreme: { baseHalfWidth: 300, limitHalfWidth: 900 },
};

const strategyMode = parseStrategyMode(process.env.KEEPER_STRATEGY_MODE);
const defaultFeeCollectionThreshold = strategyMode === "demo" ? "1000000" : "5000000";
const defaultDriftRebalanceThreshold = strategyMode === "demo" ? 0.35 : 0.7;

export const config = {
  accountId: process.env.ACCOUNT_ID || "",
  privateKey: process.env.PRIVATE_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.HAK_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  rpcUrl: process.env.RPC_URL || DEFAULT_RPC_URL,
  mainnetRpcUrl: process.env.MAINNET_RPC_URL || DEFAULT_MAINNET_RPC_URL,
  factoryAddress: (process.env.FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS) as HexAddress,
  port: parseInteger(process.env.PORT, 3002),
  pollIntervalMs: parseInteger(process.env.POLL_INTERVAL_MS, 3600000),
  pairLabel: process.env.KEEPER_PAIR || "HBAR/USDC",
  saucerswapPoolAddress: (process.env.SAUCERSWAP_POOL_ADDRESS ||
    DEFAULT_SAUCERSWAP_POOL_ADDRESS) as HexAddress,
  strategyMode,
  mockApy: parseFloatValue(process.env.KEEPER_MOCK_APY, 29),
  spotPriceBase: parseFloatValue(process.env.KEEPER_SPOT_PRICE_BASE, 0.081),
  feeCollectionThreshold: BigInt(
    process.env.KEEPER_FEE_COLLECTION_THRESHOLD || defaultFeeCollectionThreshold,
  ),
  tickSpacing: parseInteger(process.env.KEEPER_TICK_SPACING, 60),
  driftRebalanceThreshold: parseFloatValue(
    process.env.KEEPER_DRIFT_REBALANCE_THRESHOLD,
    defaultDriftRebalanceThreshold,
  ),
  rebalanceRepairAttempts: parseInteger(process.env.KEEPER_REBALANCE_RETRY_ATTEMPTS, 3),
  volatilityThresholds,
  regimeProfiles,
} as const;

export function hasDecisionAgentConfig(): boolean {
  return Boolean(config.accountId && config.privateKey && config.groqApiKey);
}

export function hasExecutionConfig(): boolean {
  return Boolean(config.privateKey);
}
