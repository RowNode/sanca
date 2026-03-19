import { createPublicClient, decodeEventLog, getAddress, http } from "viem";
import type { Address } from "viem";

import { SancaFactoryAbi, SancaPoolAbi } from "@/lib/abis";

const HEDERA_TESTNET = {
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { decimals: 18, name: "HBAR", symbol: "HBAR" },
  rpcUrls: {
    default: {
      http: [process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api"],
    },
  },
} as const;

const RPC_URL = process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api";
const MIRROR_API_URL =
  process.env.HEDERA_MIRROR_RPC_URL ||
  "https://testnet.mirrornode.hedera.com/api/v1";
const MIRROR_ORIGIN = new URL(MIRROR_API_URL).origin;
const FACTORY_ADDRESS = (
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS || process.env.SANCA_FACTORY
) as Address;

const publicClient = createPublicClient({
  chain: HEDERA_TESTNET,
  transport: http(RPC_URL),
});

type PoolState = "Open" | "Active" | "Completed";

export interface SerializedPool {
  id: string;
  creator: string;
  name: string;
  description: string;
  maxMembers: number;
  contributionPerPeriod: string;
  periodDuration: string;
  yieldBonusSplit: number;
  state: PoolState;
  currentCycle: number;
  totalCycles: number;
  cycleStartTime: string;
  createdAtTimestamp: string;
}

export interface SerializedMember {
  id: string;
  poolId: string;
  address: string;
  contribution: string;
  joinedAtTimestamp: string;
}

export interface SerializedCycle {
  id: string;
  poolId: string;
  index: number;
  winner: string;
  prize: string;
  yieldBonus: string;
  compounded: string;
  createdAtTimestamp: string;
}

export interface SerializedCycleContribution {
  id: string;
  poolId: string;
  cycleIndex: number;
  memberAddress: string;
  amount: string;
  isLiquidated: boolean;
  createdAtTimestamp: string;
}

export interface SerializedPoolDetail {
  pool: SerializedPool | null;
  members: SerializedMember[];
  cycles: SerializedCycle[];
  cycleContributions: SerializedCycleContribution[];
}

export interface SerializedIndexerSnapshot {
  pools: SerializedPool[];
  members: SerializedMember[];
  cycles: SerializedCycle[];
  cycleContributions: SerializedCycleContribution[];
}

interface MirrorLog {
  address: string;
  block_number: number;
  data: `0x${string}`;
  index: number;
  timestamp: string;
  topics: `0x${string}`[];
  transaction_hash: string;
}

interface MirrorLogsResponse {
  logs?: MirrorLog[];
  links?: {
    next?: string | null;
  };
}

type LogTopics = [`0x${string}`, ...`0x${string}`[]];

interface FactoryPoolMetadata {
  creator: string;
  name: string;
  description: string;
  maxMembers: number;
  contributionPerPeriod: bigint;
  periodDuration: bigint;
  yieldBonusSplit: number;
  createdAtTimestamp: bigint;
}

function normalizeAddress(address: string): string {
  try {
    return getAddress(address).toLowerCase();
  } catch {
    return address.toLowerCase();
  }
}

function mapPoolState(state: bigint | number): PoolState {
  const value = Number(state);
  if (value === 1) return "Active";
  if (value === 2) return "Completed";
  return "Open";
}

function toUnixSeconds(timestamp: string): bigint {
  const [seconds = "0"] = timestamp.split(".");
  return BigInt(seconds);
}

function hasTopics(topics: `0x${string}`[]): topics is LogTopics {
  return topics.length > 0;
}

function serializePool(pool: {
  id: string;
  creator: string;
  name: string;
  description: string;
  maxMembers: number;
  contributionPerPeriod: bigint;
  periodDuration: bigint;
  yieldBonusSplit: number;
  state: PoolState;
  currentCycle: number;
  totalCycles: number;
  cycleStartTime: bigint;
  createdAtTimestamp: bigint;
}): SerializedPool {
  return {
    ...pool,
    contributionPerPeriod: pool.contributionPerPeriod.toString(),
    periodDuration: pool.periodDuration.toString(),
    cycleStartTime: pool.cycleStartTime.toString(),
    createdAtTimestamp: pool.createdAtTimestamp.toString(),
  };
}

function serializeMember(member: {
  id: string;
  poolId: string;
  address: string;
  contribution: bigint;
  joinedAtTimestamp: bigint;
}): SerializedMember {
  return {
    ...member,
    contribution: member.contribution.toString(),
    joinedAtTimestamp: member.joinedAtTimestamp.toString(),
  };
}

function serializeCycle(cycle: {
  id: string;
  poolId: string;
  index: number;
  winner: string;
  prize: bigint;
  yieldBonus: bigint;
  compounded: bigint;
  createdAtTimestamp: bigint;
}): SerializedCycle {
  return {
    ...cycle,
    prize: cycle.prize.toString(),
    yieldBonus: cycle.yieldBonus.toString(),
    compounded: cycle.compounded.toString(),
    createdAtTimestamp: cycle.createdAtTimestamp.toString(),
  };
}

function serializeContribution(contribution: {
  id: string;
  poolId: string;
  cycleIndex: number;
  memberAddress: string;
  amount: bigint;
  isLiquidated: boolean;
  createdAtTimestamp: bigint;
}): SerializedCycleContribution {
  return {
    ...contribution,
    amount: contribution.amount.toString(),
    createdAtTimestamp: contribution.createdAtTimestamp.toString(),
  };
}

async function fetchMirrorJson(url: string): Promise<MirrorLogsResponse> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Mirror Node request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function buildMirrorLogsUrl(pathname: string): string {
  return new URL(pathname, `${MIRROR_API_URL.replace(/\/$/, "")}/`).toString();
}

async function fetchAllMirrorLogs(address: string): Promise<MirrorLog[]> {
  const logs: MirrorLog[] = [];
  let nextUrl: string | null = buildMirrorLogsUrl(
    `contracts/${normalizeAddress(address)}/results/logs?order=asc&limit=100`,
  );

  while (nextUrl) {
    const page = await fetchMirrorJson(nextUrl);
    logs.push(...(page.logs ?? []));

    if (page.links?.next) {
      nextUrl = new URL(page.links.next, MIRROR_ORIGIN).toString();
    } else {
      nextUrl = null;
    }
  }

  return logs;
}

async function getFactoryPoolMetadataMap(): Promise<Map<string, FactoryPoolMetadata>> {
  const metadata = new Map<string, FactoryPoolMetadata>();
  const logs = await fetchAllMirrorLogs(FACTORY_ADDRESS);

  for (const log of logs) {
    try {
      if (!hasTopics(log.topics)) {
        continue;
      }

      const decoded = decodeEventLog({
        abi: SancaFactoryAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== "PoolCreated") {
        continue;
      }

      const poolAddress = normalizeAddress(decoded.args.pool);
      metadata.set(poolAddress, {
        creator: normalizeAddress(decoded.args.creator),
        name: decoded.args.poolName,
        description: decoded.args.poolDescription,
        maxMembers: Number(decoded.args.maxMembers),
        contributionPerPeriod: decoded.args.contributionPerPeriod,
        periodDuration: decoded.args.periodDuration,
        yieldBonusSplit: Number(decoded.args.yieldBonusSplit),
        createdAtTimestamp: toUnixSeconds(log.timestamp),
      });
    } catch {
      continue;
    }
  }

  return metadata;
}

async function getAllPoolAddresses(metadata: Map<string, FactoryPoolMetadata>): Promise<string[]> {
  const addresses = new Set<string>(metadata.keys());

  if (FACTORY_ADDRESS) {
    const pools = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: SancaFactoryAbi,
      functionName: "getAllPools",
    });

    for (const pool of pools as Address[]) {
      addresses.add(normalizeAddress(pool));
    }
  }

  return Array.from(addresses);
}

async function buildPoolSnapshot(
  poolAddress: string,
  metadata?: FactoryPoolMetadata,
): Promise<SerializedPoolDetail> {
  const normalizedPoolAddress = normalizeAddress(poolAddress);
  const [info, fallbackCreator, fallbackName, fallbackDescription, fallbackCreatedAt, logs] =
    await Promise.all([
      publicClient.readContract({
        address: normalizedPoolAddress as Address,
        abi: SancaPoolAbi,
        functionName: "getPoolInfo",
      }),
      publicClient.readContract({
        address: normalizedPoolAddress as Address,
        abi: SancaPoolAbi,
        functionName: "owner",
      }),
      publicClient.readContract({
        address: normalizedPoolAddress as Address,
        abi: SancaPoolAbi,
        functionName: "poolName",
      }),
      publicClient.readContract({
        address: normalizedPoolAddress as Address,
        abi: SancaPoolAbi,
        functionName: "poolDescription",
      }),
      publicClient.readContract({
        address: normalizedPoolAddress as Address,
        abi: SancaPoolAbi,
        functionName: "poolCreationTime",
      }),
      fetchAllMirrorLogs(normalizedPoolAddress),
    ]);

  const poolInfo = info as readonly (bigint | number)[];
  const state = Number(poolInfo[0] ?? 0);
  const maxMembers = Number(poolInfo[1] ?? 0);
  const contributionPerPeriod = BigInt(poolInfo[3] ?? 0);
  const periodDuration = BigInt(poolInfo[4] ?? 0);
  const yieldBonusSplit = Number(poolInfo[5] ?? 0);
  const currentCycle = BigInt(poolInfo[6] ?? 0);
  const totalCycles = BigInt(poolInfo[7] ?? 0);
  const cycleStartTime = BigInt(poolInfo[8] ?? 0);

  const members = new Map<
    string,
    {
      id: string;
      poolId: string;
      address: string;
      contribution: bigint;
      joinedAtTimestamp: bigint;
    }
  >();
  const cycles = new Map<
    number,
    {
      id: string;
      poolId: string;
      index: number;
      winner: string;
      prize: bigint;
      yieldBonus: bigint;
      compounded: bigint;
      createdAtTimestamp: bigint;
    }
  >();
  const contributions: Array<{
    id: string;
    poolId: string;
    cycleIndex: number;
    memberAddress: string;
    amount: bigint;
    isLiquidated: boolean;
    createdAtTimestamp: bigint;
  }> = [];

  for (const log of logs) {
    try {
      if (!hasTopics(log.topics)) {
        continue;
      }

      const decoded = decodeEventLog({
        abi: SancaPoolAbi,
        data: log.data,
        topics: log.topics,
      });
      const timestamp = toUnixSeconds(log.timestamp);

      if (decoded.eventName === "Joined") {
        const memberAddress = normalizeAddress(decoded.args.member);
        members.set(memberAddress, {
          id: `${normalizedPoolAddress}-${memberAddress}`,
          poolId: normalizedPoolAddress,
          address: memberAddress,
          contribution: decoded.args.contribution,
          joinedAtTimestamp: timestamp,
        });
        continue;
      }

      if (
        decoded.eventName === "Contributed" ||
        decoded.eventName === "CollateralLiquidated"
      ) {
        const memberAddress = normalizeAddress(decoded.args.member);
        const cycleIndex = Number(decoded.args.cycle);

        contributions.push({
          id: `${normalizedPoolAddress}-${cycleIndex}-${memberAddress}-${decoded.eventName}-${log.transaction_hash}-${log.index}`,
          poolId: normalizedPoolAddress,
          cycleIndex,
          memberAddress,
          amount: decoded.args.amount,
          isLiquidated: decoded.eventName === "CollateralLiquidated",
          createdAtTimestamp: timestamp,
        });
        continue;
      }

      if (decoded.eventName === "WinnerSelected") {
        const cycleIndex = Number(decoded.args.cycle);
        const existing = cycles.get(cycleIndex);

        cycles.set(cycleIndex, {
          id: `${normalizedPoolAddress}-${cycleIndex}`,
          poolId: normalizedPoolAddress,
          index: cycleIndex,
          winner: normalizeAddress(decoded.args.winner),
          prize: decoded.args.prize,
          yieldBonus: existing?.yieldBonus ?? BigInt(0),
          compounded: existing?.compounded ?? BigInt(0),
          createdAtTimestamp: existing?.createdAtTimestamp ?? timestamp,
        });
        continue;
      }

      if (decoded.eventName === "YieldDistributed") {
        const cycleIndex = Number(decoded.args.cycle);
        const existing = cycles.get(cycleIndex);

        cycles.set(cycleIndex, {
          id: `${normalizedPoolAddress}-${cycleIndex}`,
          poolId: normalizedPoolAddress,
          index: cycleIndex,
          winner: existing?.winner ?? normalizeAddress(decoded.args.winner),
          prize: existing?.prize ?? BigInt(0),
          yieldBonus: decoded.args.yieldBonus,
          compounded: decoded.args.compounded,
          createdAtTimestamp: existing?.createdAtTimestamp ?? timestamp,
        });
      }
    } catch {
      continue;
    }
  }

  const pool = serializePool({
    id: normalizedPoolAddress,
    creator: normalizeAddress(String(metadata?.creator ?? fallbackCreator)),
    name: metadata?.name ?? String(fallbackName),
    description: metadata?.description ?? String(fallbackDescription),
    maxMembers: metadata?.maxMembers ?? Number(maxMembers),
    contributionPerPeriod: metadata?.contributionPerPeriod ?? contributionPerPeriod,
    periodDuration: metadata?.periodDuration ?? periodDuration,
    yieldBonusSplit: metadata?.yieldBonusSplit ?? Number(yieldBonusSplit),
    state: mapPoolState(state),
    currentCycle: Number(currentCycle),
    totalCycles: Number(totalCycles),
    cycleStartTime,
    createdAtTimestamp:
      metadata?.createdAtTimestamp ?? BigInt(fallbackCreatedAt ?? BigInt(0)),
  });

  return {
    pool,
    members: Array.from(members.values())
      .sort((a, b) => Number(a.joinedAtTimestamp - b.joinedAtTimestamp))
      .map(serializeMember),
    cycles: Array.from(cycles.values())
      .sort((a, b) => a.index - b.index)
      .map(serializeCycle),
    cycleContributions: contributions
      .sort((a, b) => {
        if (a.cycleIndex !== b.cycleIndex) {
          return a.cycleIndex - b.cycleIndex;
        }
        return Number(a.createdAtTimestamp - b.createdAtTimestamp);
      })
      .map(serializeContribution),
  };
}

export async function getSerializedPoolDetail(poolAddress: string): Promise<SerializedPoolDetail> {
  const metadata = await getFactoryPoolMetadataMap();
  return buildPoolSnapshot(poolAddress, metadata.get(normalizeAddress(poolAddress)));
}

export async function getSerializedIndexerSnapshot(): Promise<SerializedIndexerSnapshot> {
  const metadata = await getFactoryPoolMetadataMap();
  const poolAddresses = await getAllPoolAddresses(metadata);
  const settledSnapshots = await Promise.allSettled(
    poolAddresses.map((poolAddress) =>
      buildPoolSnapshot(poolAddress, metadata.get(normalizeAddress(poolAddress))),
    ),
  );

  const pools: SerializedPool[] = [];
  const members: SerializedMember[] = [];
  const cycles: SerializedCycle[] = [];
  const cycleContributions: SerializedCycleContribution[] = [];

  for (const result of settledSnapshots) {
    if (result.status !== "fulfilled") {
      console.error("[mirror] failed to build pool snapshot", result.reason);
      continue;
    }

    if (!result.value.pool) {
      continue;
    }

    pools.push(result.value.pool);
    members.push(...result.value.members);
    cycles.push(...result.value.cycles);
    cycleContributions.push(...result.value.cycleContributions);
  }

  pools.sort(
    (a, b) => Number(BigInt(b.createdAtTimestamp) - BigInt(a.createdAtTimestamp)),
  );
  members.sort(
    (a, b) => Number(BigInt(a.joinedAtTimestamp) - BigInt(b.joinedAtTimestamp)),
  );
  cycles.sort((a, b) => a.index - b.index);
  cycleContributions.sort((a, b) => {
    if (a.poolId !== b.poolId) {
      return a.poolId.localeCompare(b.poolId);
    }
    if (a.cycleIndex !== b.cycleIndex) {
      return a.cycleIndex - b.cycleIndex;
    }
    return Number(BigInt(a.createdAtTimestamp) - BigInt(b.createdAtTimestamp));
  });

  return {
    pools,
    members,
    cycles,
    cycleContributions,
  };
}

export async function getSerializedPools(): Promise<SerializedPool[]> {
  const snapshot = await getSerializedIndexerSnapshot();
  return snapshot.pools;
}
