import { Erc20MetadataAbi, SaucerSwapPoolAbi } from "./abi.js";
import { mainnetClient, publicClient } from "./clients.js";
import { config } from "./config.js";
import type { HexAddress, MarketSignal, Thresholds, TokenMetadata, VolatilityRegime } from "./types.js";
import { clamp, hashString, nowSec } from "./utils.js";

interface SafeReadParams<T> {
  client?: any;
  address: HexAddress;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  fallbackValue: T;
}

export async function safeReadContract<T>({
  client = publicClient as any,
  address,
  abi,
  functionName,
  args = [],
  fallbackValue,
}: SafeReadParams<T>): Promise<T> {
  try {
    return (await client.readContract({
      address,
      abi,
      functionName,
      args,
    })) as T;
  } catch (_error) {
    return fallbackValue;
  }
}

function classifyRegime(realizedVolatility24h: number): VolatilityRegime {
  if (realizedVolatility24h < config.volatilityThresholds.low) return "low";
  if (realizedVolatility24h < config.volatilityThresholds.medium) return "medium";
  if (realizedVolatility24h < config.volatilityThresholds.high) return "high";
  return "extreme";
}

function buildMockVolatilitySignal(poolAddress: HexAddress): MarketSignal {
  const seconds = Number(nowSec());
  const seed = hashString(poolAddress.toLowerCase()) % 360;
  const waveA = Math.sin(seconds / 1800 + seed);
  const waveB = Math.cos(seconds / 7200 + seed / 2);
  const spotPrice = clamp(config.spotPriceBase * (1 + waveA * 0.04), 0.05, 0.13);
  const realizedVolatility1h = clamp(0.05 + Math.abs(waveA) * 0.12, 0.04, 0.18);
  const realizedVolatility24h = clamp(0.1 + Math.abs(waveB) * 0.32, 0.08, 0.46);
  const realizedVolatility7d = clamp((realizedVolatility1h + realizedVolatility24h) / 2 + 0.06, 0.12, 0.5);

  return {
    pair: config.pairLabel,
    source: "mock-seeded",
    spotPrice: Number(spotPrice.toFixed(6)),
    realizedVolatility1h: Number(realizedVolatility1h.toFixed(4)),
    realizedVolatility24h: Number(realizedVolatility24h.toFixed(4)),
    realizedVolatility7d: Number(realizedVolatility7d.toFixed(4)),
    volatilityRegime: classifyRegime(realizedVolatility24h),
    thresholds: config.volatilityThresholds as Thresholds,
  };
}

function tickToToken1PerToken0Price(tick: number, token0Decimals: number, token1Decimals: number): number {
  return Math.pow(1.0001, tick) * Math.pow(10, token0Decimals - token1Decimals);
}

function invertPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return 1 / value;
}

function annualizeAbsReturn(currentPrice: number, referencePrice: number, periodsPerYear: number): number {
  if (!currentPrice || !referencePrice || currentPrice <= 0 || referencePrice <= 0) return 0;
  const logReturn = Math.abs(Math.log(currentPrice / referencePrice));
  return logReturn * Math.sqrt(periodsPerYear);
}

async function fetchSaucerSwapVolatilitySignal(): Promise<MarketSignal> {
  const [slot0, observeResult, token0Address, token1Address] = (await Promise.all([
    mainnetClient.readContract({
      address: config.saucerswapPoolAddress,
      abi: SaucerSwapPoolAbi,
      functionName: "slot0",
    }),
    mainnetClient.readContract({
      address: config.saucerswapPoolAddress,
      abi: SaucerSwapPoolAbi,
      functionName: "observe",
      args: [[86400, 21600, 3600, 0]],
    }),
    mainnetClient.readContract({
      address: config.saucerswapPoolAddress,
      abi: SaucerSwapPoolAbi,
      functionName: "token0",
    }),
    mainnetClient.readContract({
      address: config.saucerswapPoolAddress,
      abi: SaucerSwapPoolAbi,
      functionName: "token1",
    }),
  ])) as [
    readonly [bigint, number, number, number, number, number, boolean],
    readonly [bigint[], bigint[]],
    HexAddress,
    HexAddress,
  ];

  const [, currentTick] = slot0;
  const [tickCumulatives] = observeResult;

  const [token0Symbol, token0Decimals, token1Symbol, token1Decimals] = await Promise.all([
    safeReadContract({
      client: mainnetClient,
      address: token0Address,
      abi: Erc20MetadataAbi,
      functionName: "symbol",
      fallbackValue: "TOKEN0",
    }),
    safeReadContract({
      client: mainnetClient,
      address: token0Address,
      abi: Erc20MetadataAbi,
      functionName: "decimals",
      fallbackValue: 6,
    }),
    safeReadContract({
      client: mainnetClient,
      address: token1Address,
      abi: Erc20MetadataAbi,
      functionName: "symbol",
      fallbackValue: "TOKEN1",
    }),
    safeReadContract({
      client: mainnetClient,
      address: token1Address,
      abi: Erc20MetadataAbi,
      functionName: "decimals",
      fallbackValue: 18,
    }),
  ]);

  const currentTickNumber = Number(currentTick);
  const avgTick1h = Number((tickCumulatives[3] - tickCumulatives[2]) / 3600n);
  const avgTick6h = Number((tickCumulatives[3] - tickCumulatives[1]) / 21600n);
  const avgTick24h = Number((tickCumulatives[3] - tickCumulatives[0]) / 86400n);

  const token0: TokenMetadata = {
    address: token0Address,
    symbol: String(token0Symbol),
    decimals: Number(token0Decimals),
  };
  const token1: TokenMetadata = {
    address: token1Address,
    symbol: String(token1Symbol),
    decimals: Number(token1Decimals),
  };

  const spotBasePerQuote = invertPrice(
    tickToToken1PerToken0Price(currentTickNumber, token0.decimals, token1.decimals),
  );
  const twap1h = invertPrice(tickToToken1PerToken0Price(avgTick1h, token0.decimals, token1.decimals));
  const twap6h = invertPrice(tickToToken1PerToken0Price(avgTick6h, token0.decimals, token1.decimals));
  const twap24h = invertPrice(
    tickToToken1PerToken0Price(avgTick24h, token0.decimals, token1.decimals),
  );

  const realizedVolatility1h = annualizeAbsReturn(spotBasePerQuote, twap1h, 24 * 365);
  const realizedVolatility24h = annualizeAbsReturn(spotBasePerQuote, twap24h, 365);
  const realizedVolatility7d = Math.min(realizedVolatility24h * Math.sqrt(7), 2);

  return {
    pair: config.pairLabel,
    source: "saucerswap-mainnet-observe",
    poolAddress: config.saucerswapPoolAddress,
    token0,
    token1,
    spotPrice: Number(spotBasePerQuote.toFixed(6)),
    twapPrice1h: Number(twap1h.toFixed(6)),
    twapPrice6h: Number(twap6h.toFixed(6)),
    twapPrice24h: Number(twap24h.toFixed(6)),
    twapPrice7d: Number(twap24h.toFixed(6)),
    currentTick: currentTickNumber,
    avgTick1h,
    avgTick6h,
    avgTick24h,
    avgTick7d: avgTick24h,
    realizedVolatility1h: Number(realizedVolatility1h.toFixed(4)),
    realizedVolatility24h: Number(realizedVolatility24h.toFixed(4)),
    realizedVolatility7d: Number(realizedVolatility7d.toFixed(4)),
    volatilityRegime: classifyRegime(realizedVolatility24h),
    thresholds: config.volatilityThresholds as Thresholds,
  };
}

export async function buildVolatilitySignal(poolAddress: HexAddress): Promise<MarketSignal> {
  try {
    return await fetchSaucerSwapVolatilitySignal();
  } catch (_error) {
    return buildMockVolatilitySignal(poolAddress);
  }
}
