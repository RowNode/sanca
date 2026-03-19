import type { HexAddress } from "./types.js";

const DEFAULT_RPC_URL = "https://testnet.hashio.io/api";
const DEFAULT_FACTORY_ADDRESS = "0x08a74CB8D0B398d9d6add0992085E488321Ef686" as HexAddress;

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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

export const config = {
  rpcUrl: process.env.RPC_URL || DEFAULT_RPC_URL,
  factoryAddress: (process.env.FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS) as HexAddress,
  pollIntervalMs: parseInteger(process.env.POLL_INTERVAL_MS, 300000),
  port: parseInteger(process.env.PORT, 3001),
  watchPollingIntervalMs: parseInteger(process.env.WATCH_POLLING_INTERVAL_MS, 2000),
  logLevel: (process.env.LOG_LEVEL || "info").toLowerCase(),
  privateKey: process.env.PRIVATE_KEY_SETTLER || process.env.PRIVATE_KEY || "",
} as const;

export function hasExecutionConfig(): boolean {
  return Boolean(config.privateKey);
}
