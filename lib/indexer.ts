export interface Pool {
  id: string;
  creator: string;
  name: string;
  description: string;
  maxMembers: number;
  contributionPerPeriod: bigint;
  periodDuration: bigint;
  yieldBonusSplit: number;
  state: "Open" | "Active" | "Completed";
  currentCycle: number;
  totalCycles: number;
  cycleStartTime: bigint;
  createdAtTimestamp: bigint;
  keeperApy7d?: number;
  keeperApy30d?: number;
  keeperVaultTvlUsd?: number;
  keeperAccumulatedYieldUsd?: number;
  keeperRecentFeesCollectedUsd?: number;
  keeperVolatilityRegime?: "low" | "medium" | "high" | "extreme";
  keeperNextAction?: "rebalance" | "collectFees" | "noop";
  keeperDecisionSource?: "groq-agent" | "rules-fallback" | "unknown";
}

export interface Member {
  id: string;
  poolId: string;
  address: string;
  contribution: bigint;
  joinedAtTimestamp: bigint;
}

export interface Cycle {
  id: string;
  poolId: string;
  index: number;
  winner: string;
  prize: bigint;
  yieldBonus: bigint;
  compounded: bigint;
  createdAtTimestamp: bigint;
}

export interface CycleContribution {
  id: string;
  poolId: string;
  cycleIndex: number;
  memberAddress: string;
  amount: bigint;
  isLiquidated: boolean;
  createdAtTimestamp: bigint;
}

export interface PoolDetail {
  pool: Pool | null;
  members: Member[];
  cycles: Cycle[];
  cycleContributions: CycleContribution[];
}

export interface IndexerSnapshot {
  pools: Pool[];
  members: Member[];
  cycles: Cycle[];
  cycleContributions: CycleContribution[];
}

interface SerializedPool
  extends Omit<
    Pool,
    "contributionPerPeriod" | "periodDuration" | "cycleStartTime" | "createdAtTimestamp"
  > {
  contributionPerPeriod: string;
  periodDuration: string;
  cycleStartTime: string;
  createdAtTimestamp: string;
}

interface SerializedMember extends Omit<Member, "contribution" | "joinedAtTimestamp"> {
  contribution: string;
  joinedAtTimestamp: string;
}

interface SerializedCycle
  extends Omit<Cycle, "prize" | "yieldBonus" | "compounded" | "createdAtTimestamp"> {
  prize: string;
  yieldBonus: string;
  compounded: string;
  createdAtTimestamp: string;
}

interface SerializedCycleContribution
  extends Omit<CycleContribution, "amount" | "createdAtTimestamp"> {
  amount: string;
  createdAtTimestamp: string;
}

interface SerializedPoolDetail {
  pool: SerializedPool | null;
  members: SerializedMember[];
  cycles: SerializedCycle[];
  cycleContributions: SerializedCycleContribution[];
}

interface SerializedIndexerSnapshot {
  pools: SerializedPool[];
  members: SerializedMember[];
  cycles: SerializedCycle[];
  cycleContributions: SerializedCycleContribution[];
}

function parsePool(pool: SerializedPool): Pool {
  return {
    ...pool,
    contributionPerPeriod: BigInt(pool.contributionPerPeriod),
    periodDuration: BigInt(pool.periodDuration),
    cycleStartTime: BigInt(pool.cycleStartTime),
    createdAtTimestamp: BigInt(pool.createdAtTimestamp),
  };
}

function parseMember(member: SerializedMember): Member {
  return {
    ...member,
    contribution: BigInt(member.contribution),
    joinedAtTimestamp: BigInt(member.joinedAtTimestamp),
  };
}

function parseCycle(cycle: SerializedCycle): Cycle {
  return {
    ...cycle,
    prize: BigInt(cycle.prize),
    yieldBonus: BigInt(cycle.yieldBonus),
    compounded: BigInt(cycle.compounded),
    createdAtTimestamp: BigInt(cycle.createdAtTimestamp),
  };
}

function parseContribution(contribution: SerializedCycleContribution): CycleContribution {
  return {
    ...contribution,
    amount: BigInt(contribution.amount),
    createdAtTimestamp: BigInt(contribution.createdAtTimestamp),
  };
}

async function fetchApi<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchPools(): Promise<Pool[]> {
  const pools = await fetchApi<SerializedPool[]>("/api/pools");
  return pools.map(parsePool);
}

export async function fetchPoolDetail(poolId: string): Promise<PoolDetail> {
  const detail = await fetchApi<SerializedPoolDetail>(`/api/pools/${poolId.toLowerCase()}`);
  const pool = detail.pool === null ? null : parsePool(detail.pool);

  return {
    pool,
    members: detail.members.map(parseMember),
    cycles: detail.cycles.map(parseCycle),
    cycleContributions: detail.cycleContributions.map(parseContribution),
  };
}

export async function fetchIndexerSnapshot(): Promise<IndexerSnapshot> {
  const snapshot = await fetchApi<SerializedIndexerSnapshot>("/api/indexer/snapshot");
  return {
    pools: snapshot.pools.map(parsePool),
    members: snapshot.members.map(parseMember),
    cycles: snapshot.cycles.map(parseCycle),
    cycleContributions: snapshot.cycleContributions.map(parseContribution),
  };
}
